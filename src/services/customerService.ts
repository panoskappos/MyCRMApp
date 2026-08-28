import {
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  setDoc,
  doc,
  startAfter,
  QueryDocumentSnapshot,
  deleteDoc,
  writeBatch,
  getCountFromServer,
  updateDoc,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../firebase";
import type { Customer, Store, FireExtinguisher, Inspection, PaginatedCustomers } from "../types";


interface FetchCustomersOptions {
  searchTerm?: string;
  isActive?: boolean;
  lastVisible?: QueryDocumentSnapshot;
  expiryMonth?: number | null;
  city?: string | null;
  expiryWithinDays?: number | null;
  requireTaxNumber?: boolean;
  requireEmail?: boolean;
  requireMobile?: boolean;
  limit?: number;
}

/**
 * Helper function to normalize Greek text for search
 */
function normalizeGreek(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .trim();
}

const parseToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value !== null && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !isNaN(date.getTime()) ? date : null;
  }
  return null;
};

export const fetchCustomers = async ({
  searchTerm,
  isActive,
  lastVisible,
  expiryMonth,
  city,
  expiryWithinDays,
  requireTaxNumber,
  requireEmail,
  requireMobile,
  limit: limitOption = 30
}: FetchCustomersOptions = {}): Promise<PaginatedCustomers> => {
  try {
    const customersRef = collection(db, "customers");
    const shouldApplyExpiryFilter = typeof expiryMonth === "number" && expiryMonth >= 0 && expiryMonth <= 11;
    const normalizedCity = city ? normalizeGreek(city) : null;
    const hasExpiryWindowFilter = typeof expiryWithinDays === "number" && expiryWithinDays >= 0;
    const requiresContactFilter = requireTaxNumber === true || requireEmail === true || requireMobile === true;
    const requiresAdvancedFiltering = shouldApplyExpiryFilter
      || Boolean(normalizedCity)
      || hasExpiryWindowFilter
      || requiresContactFilter;
    const hasSearchTerm = Boolean(searchTerm?.trim());
    const disablePagination = hasSearchTerm || requiresAdvancedFiltering || isActive !== undefined;

    // When searching, load all customers; otherwise paginate
    const queryConstraints: any[] = [];

    if (!disablePagination) {
      queryConstraints.push(limit(limitOption));
      if (lastVisible) queryConstraints.push(startAfter(lastVisible));
    }

    const customersQuery = queryConstraints.length > 0
      ? query(customersRef, ...queryConstraints)
      : query(customersRef);
    const querySnapshot = await getDocs(customersQuery);

    // ------------------------------------------------------------------
    // ΕΔΩ ΓΙΝΕΤΑΙ Η ΑΛΛΑΓΗ ΓΙΑ ΤΟΥΣ ΜΕΤΡΗΤΕΣ (DENORMALIZATION)
    // ------------------------------------------------------------------
    let customers: Customer[] = querySnapshot.docs.map((customerDoc) => {
      const data = customerDoc.data();
      return {
        customerID: customerDoc.id,
        name: data.name || null,
        taxNumber: data.taxNumber || null,
        city: data.city || null,
        address: data.address || null,
        mobile: data.mobile || null,
        land_line: data.land_line || null,
        email: data.email || null,
        comments: data.comments || null,
        isActive: data.isActive === true,

        // Διαβάζουμε τους μετρητές απευθείας από τη βάση! 
        // Αν δεν υπάρχουν (παλιοί πελάτες), βάζουμε 0.
        storeCount: data.storeCount || 0,
        extinguisherCount: data.extinguisherCount || 0,

        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    // Apply client-side filtering
    if (isActive !== undefined) {
      customers = customers.filter(c => c.isActive === isActive);
    }

    if (searchTerm?.trim()) {
      const normalizedSearch = normalizeGreek(searchTerm);
      customers = customers.filter(customer => {
        return [
          customer.name,
          customer.email,
          customer.city,
          customer.taxNumber,
          customer.mobile,
          customer.customerID
        ].some(field => {
          if (!field || typeof field !== 'string') return false;
          return normalizeGreek(field).includes(normalizedSearch);
        });
      });
    }

    if (normalizedCity) {
      customers = customers.filter(customer => {
        if (!customer.city || typeof customer.city !== 'string') return false;
        return normalizeGreek(customer.city).includes(normalizedCity);
      });
    }

    if (requireTaxNumber === true) {
      customers = customers.filter(customer => Boolean(customer.taxNumber));
    }

    if (requireEmail === true) {
      customers = customers.filter(customer => Boolean(customer.email));
    }

    if (requireMobile === true) {
      customers = customers.filter(customer => Boolean(customer.mobile));
    }

    const needsExtinguisherData = shouldApplyExpiryFilter || hasExpiryWindowFilter;

    if (needsExtinguisherData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryWindowLimit = hasExpiryWindowFilter && typeof expiryWithinDays === "number"
        ? (() => {
          const limit = new Date(today);
          limit.setDate(limit.getDate() + expiryWithinDays);
          limit.setHours(23, 59, 59, 999);
          return limit;
        })()
        : null;

      const customersMatchingAdvancedFilters = await Promise.all(
        customers.map(async (customer) => {
          try {
            const extinguishers = await getFireExtinguishersWithInspectionsByCustomerId(customer.customerID);

            let matchesExpiryMonth = !shouldApplyExpiryFilter;
            let matchesExpiryWindow = !hasExpiryWindowFilter;

            for (const extinguisher of extinguishers) {
              const inspectionsRecord = extinguisher.inspections ?? {};
              const inspectionsArray = Object.values(inspectionsRecord);

              for (const inspection of inspectionsArray) {
                const recheckDate = parseToDate(inspection.recheckDate);
                if (recheckDate) {
                  if (shouldApplyExpiryFilter && recheckDate.getMonth() === expiryMonth) {
                    matchesExpiryMonth = true;
                  }

                  if (hasExpiryWindowFilter && expiryWindowLimit) {
                    const normalizedDate = new Date(recheckDate);
                    normalizedDate.setHours(0, 0, 0, 0);
                    if (normalizedDate >= today && normalizedDate <= expiryWindowLimit) {
                      matchesExpiryWindow = true;
                    }
                  }
                }

                if (matchesExpiryMonth && matchesExpiryWindow) {
                  break;
                }
              }

              if (matchesExpiryMonth && matchesExpiryWindow) {
                break;
              }
            }

            if (!matchesExpiryMonth || !matchesExpiryWindow) {
              return null;
            }

            return customer;
          } catch (error) {
            console.error(`❌ Error applying advanced filters for customer ${customer.customerID}:`, error);
            return null;
          }
        })
      );

      customers = customersMatchingAdvancedFilters.filter(
        (customer): customer is Customer => customer !== null
      );
    }

    // Sort client-side
    customers.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'el');
    });

    // When searching, return all results without pagination
    if (disablePagination) {
      return {
        customers,
        lastVisible: undefined,
        hasMore: false,
        total: customers.length
      };
    }

    // Προστασία από Quota Exceeded: Διαβάζουμε το σύνολο από το Session Storage (αν υπάρχει)
    let totalCustomersCount = 0;

    if (typeof window !== "undefined") {
      const cachedCount = sessionStorage.getItem('crm_total_customers');

      if (cachedCount) {
        // Αν υπάρχει στη μνήμη, το χρησιμοποιούμε κατευθείαν (0 Reads!)
        totalCustomersCount = parseInt(cachedCount, 10);
      } else {
        // Αν δεν υπάρχει (πρώτη φόρτωση), ρωτάμε το Firebase (1 Read ανά 1000 έγγραφα)
        const totalCountSnap = await getCountFromServer(customersRef);
        totalCustomersCount = totalCountSnap.data().count;

        // Το αποθηκεύουμε για την επόμενη φορά
        sessionStorage.setItem('crm_total_customers', totalCustomersCount.toString());
      }
    } else {
      // Fallback για περιβάλλοντα εκτός Browser
      const totalCountSnap = await getCountFromServer(customersRef);
      totalCustomersCount = totalCountSnap.data().count;
    }

    return {
      customers,
      lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === limitOption,
      total: totalCustomersCount
    };
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    throw new Error(`Failed to fetch customers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getCustomerById = async (customerId: string): Promise<Customer | null> => {
  try {
    console.log("🔍 getCustomerById called with ID:", customerId);
    const customerRef = doc(db, "customers", customerId);
    const customerDoc = await getDoc(customerRef);

    if (!customerDoc.exists()) {
      console.log("⚠️ Customer document not found:", customerId);
      return null;
    }

    const data = customerDoc.data();
    console.log("✅ Customer document loaded:", data);
    return {
      customerID: customerDoc.id,
      name: data.name || null,
      taxNumber: data.taxNumber || null,
      city: data.city || null,
      address: data.address || null,
      mobile: data.mobile || null,
      land_line: data.land_line || null,
      email: data.email || null,
      comments: data.comments || null,
      isActive: data.isActive === true,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    };
  } catch (error) {
    console.error("❌ Error fetching customer:", error);
    throw error;
  }
};

export const getStoresByCustomerId = async (customerId: string): Promise<Store[]> => {
  try {
    console.log("🔍 getStoresByCustomerId called with customerID:", customerId);
    const storesRef = collection(db, "stores");
    const q = query(storesRef, where("customerID", "==", customerId));
    const storesSnapshot = await getDocs(q);

    console.log(`✅ Found ${storesSnapshot.docs.length} stores for customer ${customerId}`);

    return storesSnapshot.docs.map((storeDoc) => {
      const data = storeDoc.data();
      return {
        storeID: storeDoc.id,
        customerID: data.customerID || customerId,
        storeName: data.storeName || null,
        city: data.city || null,
        address: data.address || null,
        mobile: data.mobile || null,
        land_line: data.land_line || null,
        email: data.email || null,
        taxNumber: data.taxNumber || null,
      };
    });
  } catch (error) {
    console.error("❌ Error fetching stores:", error);
    throw error;
  }
};

export const getStoreById = async (storeId: string): Promise<Store | null> => {
  try {
    const storeRef = doc(db, "stores", storeId);
    const storeDoc = await getDoc(storeRef);

    if (!storeDoc.exists()) {
      return null;
    }

    const data = storeDoc.data();
    return {
      storeID: storeDoc.id,
      customerID: data.customerID || null,
      storeName: data.storeName || null,
      city: data.city || null,
      address: data.address || null,
      mobile: data.mobile || null,
      land_line: data.land_line || null,
      email: data.email || null,
      taxNumber: data.taxNumber || null,
    };
  } catch (error) {
    console.error("❌ Error fetching store:", error);
    throw error;
  }
};

export const getFireExtinguishersByStoreId = async (storeId: string): Promise<FireExtinguisher[]> => {
  try {
    const extinguishersRef = collection(db, "fire_extinguishers");
    const q = query(extinguishersRef, where("storeID", "==", storeId));
    const extinguishersSnapshot = await getDocs(q);

    return extinguishersSnapshot.docs.map((extDoc) => {
      const data = extDoc.data();
      return {
        extinguisherID: extDoc.id,
        storeID: data.storeID || storeId,
        customerID: data.customerID || null,
        serialNumber: data.serialNumber || null,
        type: data.type || null,
        shellNumber: data.shellNumber || null,
        manufacturer: data.manufacturer || null,
        manufacturingYear: data.manufacturingYear || null,
        aaNumber: data.aaNumber || null,
        sold: data.sold || false,
        inspections: {},
      };
    });
  } catch (error) {
    console.error("❌ Error fetching fire extinguishers:", error);
    throw error;
  }
};

export const getFireExtinguishersByCustomerId = async (customerId: string): Promise<FireExtinguisher[]> => {
  try {
    const extinguishersRef = collection(db, "fire_extinguishers");
    const q = query(extinguishersRef, where("customerID", "==", customerId));
    const extinguishersSnapshot = await getDocs(q);

    return extinguishersSnapshot.docs.map((extDoc) => {
      const data = extDoc.data();
      return {
        extinguisherID: extDoc.id,
        storeID: data.storeID || null,
        customerID: data.customerID || customerId,
        serialNumber: data.serialNumber || null,
        type: data.type || null,
        shellNumber: data.shellNumber || null,
        manufacturer: data.manufacturer || null,
        manufacturingYear: data.manufacturingYear || null,
        aaNumber: data.aaNumber || null,
        sold: data.sold || false,
        inspections: {},
      };
    });
  } catch (error) {
    console.error("❌ Error fetching fire extinguishers:", error);
    throw error;
  }
};

export const getInspectionsByExtinguisherId = async (extinguisherId: string, includeInactive: boolean = false): Promise<Record<string, Inspection>> => {
  try {
    const inspectionsRef = collection(db, `fire_extinguishers/${extinguisherId}/inspections`);
    const inspectionsSnapshot = await getDocs(inspectionsRef);

    const inspections: Record<string, Inspection> = {};
    inspectionsSnapshot.docs.forEach((inspDoc) => {
      const data = inspDoc.data();
      const isActive = data.isActive !== undefined ? data.isActive : true; // Default to true

      // Skip inactive inspections unless explicitly requested
      if (!includeInactive && !isActive) {
        return;
      }

      inspections[inspDoc.id] = {
        inspectionDate: data.inspectionDate || null,
        recheckDate: data.recheckDate || null,
        customer: data.customer || null,
        responsible: data.responsible || null,
        maintenanceType: data.maintenanceType || null,
        status: data.status || null,
        isActive,
        // ΑΝΤΙΚΑΤΑΣΤΑΣΗ ΕΞΑΡΤ. fields from database
        // oRings: data.oRings || false,
        dischargeHose: data.dischargeHose || data.hose || false,
        lock: data.lock || false,
        pressureGauge: data.pressureGauge || false,
        safetyPin: data.safetyPin || false,
        // Additional fields
        lastRefillDate: data.lastRefillDate || null,
        repairKitLock: data.repairKitLock || false,
        sale: data.sale || false,
        unsuitable: data.unsuitable || false,
      };
    });

    return inspections;
  } catch (error) {
    console.error("❌ Error fetching inspections:", error);
    throw error;
  }
};

export const getFireExtinguishersWithInspectionsByCustomerId = async (
  customerId: string,
  includeInactive: boolean = false
): Promise<FireExtinguisher[]> => {
  try {
    const extinguishers = await getFireExtinguishersByCustomerId(customerId);

    const extinguishersWithInspections = await Promise.all(
      extinguishers.map(async (ext) => {
        const inspections = await getInspectionsByExtinguisherId(ext.extinguisherID, includeInactive);
        return { ...ext, inspections };
      })
    );

    return extinguishersWithInspections;
  } catch (error) {
    console.error("❌ Error fetching fire extinguishers with inspections:", error);
    throw error;
  }
};

export const getFireExtinguishersWithInspectionsByStoreId = async (
  storeId: string,
  includeInactive: boolean = false
): Promise<FireExtinguisher[]> => {
  try {
    const extinguishers = await getFireExtinguishersByStoreId(storeId);

    const extinguishersWithInspections = await Promise.all(
      extinguishers.map(async (ext) => {
        const inspections = await getInspectionsByExtinguisherId(ext.extinguisherID, includeInactive);
        return { ...ext, inspections };
      })
    );

    return extinguishersWithInspections;
  } catch (error) {
    console.error("❌ Error fetching fire extinguishers with inspections:", error);
    throw error;
  }
};

export const getUpcomingInspections = async (
  daysAhead: number = 30
): Promise<Array<{
  id: string;
  customerID: string;
  customerName: string;
  extinguisherID: string;
  storeID: string;
  storeName: string;
  recheckDate: string;
  type: string;
}>> => {
  try {
    const extinguishersRef = collection(db, "fire_extinguishers");
    const extinguishersSnapshot = await getDocs(extinguishersRef);

    const upcomingInspections: Array<{
      id: string;
      customerID: string;
      customerName: string;
      extinguisherID: string;
      storeID: string;
      storeName: string;
      recheckDate: string;
      type: string;
    }> = [];

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    // Load all customers and stores for lookups
    const customersSnapshot = await getDocs(collection(db, "customers"));
    const customersMap = new Map();
    customersSnapshot.docs.forEach(doc => {
      customersMap.set(doc.id, doc.data());
    });

    const storesSnapshot = await getDocs(collection(db, "stores"));
    const storesMap = new Map();
    storesSnapshot.docs.forEach(doc => {
      storesMap.set(doc.data().storeID, doc.data());
    });

    for (const extDoc of extinguishersSnapshot.docs) {
      const extData = extDoc.data() as FireExtinguisher;
      const inspectionsRef = collection(db, `fire_extinguishers/${extDoc.id}/inspections`);
      const inspectionsSnapshot = await getDocs(inspectionsRef);

      inspectionsSnapshot.docs.forEach((inspDoc) => {
        const data = inspDoc.data();
        const recheckDate = data.recheckDate;

        if (recheckDate) {
          const inspectionDate = new Date(recheckDate);
          if (inspectionDate >= today && inspectionDate <= futureDate) {
            const customer = customersMap.get(extData.customerID);
            const store = storesMap.get(extData.storeID);

            upcomingInspections.push({
              id: `${extDoc.id}-${inspDoc.id}`,
              customerID: extData.customerID,
              customerName: customer?.name || "Unknown",
              extinguisherID: extDoc.id,
              storeID: extData.storeID,
              storeName: store?.storeName || "Unknown Store",
              recheckDate: recheckDate,
              type: extData.type || "Unknown Type",
            });
          }
        }
      });
    }

    return upcomingInspections.sort((a, b) => new Date(a.recheckDate).getTime() - new Date(b.recheckDate).getTime());
  } catch (error) {
    console.error("❌ Error fetching upcoming inspections:", error);
    throw error;
  }
};

export const getTotalCustomersCount = async (): Promise<number> => {
  try {
    const customersRef = collection(db, "customers");
    const snapshot = await getCountFromServer(customersRef);
    return snapshot.data().count ?? 0;
  } catch (error) {
    console.error("❌ Error getting customers count:", error);
    return 0;
  }
};

export const getTotalFireExtinguishersCount = async (): Promise<number> => {
  try {
    const extinguishersRef = collection(db, "fire_extinguishers");
    const snapshot = await getCountFromServer(extinguishersRef);
    return snapshot.data().count ?? 0;
  } catch (error) {
    console.error("❌ Error getting fire extinguishers count:", error);
    return 0;
  }
};

export const getCustomerStats = async () => {
  try {
    const customersRef = collection(db, "customers");
    const snapshot = await getDocs(customersRef);

    let activeCount = 0;
    let inactiveCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isActive === true) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    return {
      total: snapshot.size,
      active: activeCount,
      inactive: inactiveCount
    };
  } catch (error) {
    console.error("❌ Error getting customer stats:", error);
    return { total: 0, active: 0, inactive: 0 };
  }
};


export const createCustomer = async (customerData: Customer): Promise<void> => {
  try {
    const customerRef = doc(db, "customers", customerData.customerID);
    const customerSnap = await getDoc(customerRef);

    // Έλεγχος αν υπάρχει ήδη ο κωδικός
    if (customerSnap.exists()) {
      throw new Error(`Ο κωδικός πελάτη ${customerData.customerID} υπάρχει ήδη.`);
    }

    // Αποθήκευση με αρχικοποίηση των μετρητών!
    await setDoc(customerRef, {
      ...customerData,
      storeCount: 0, // Αρχικοποίηση μετρητή καταστημάτων σε 0
      extinguisherCount: 0, // Αρχικοποίηση μετρητή πυροσβεστήρων σε 0
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });


    console.log("✅ Ο πελάτης δημιουργήθηκε επιτυχώς");
  } catch (error) {
    console.error("❌ Error creating customer:", error);
    throw error;
  }
};


// (Πρόσθεσε το increment στα imports του firebase/firestore αν δεν υπάρχει)

export const createStore = async (storeData: Store): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // 1. Reference για το νέο κατάστημα
    const storeRef = doc(db, "stores", storeData.storeID);
    batch.set(storeRef, {
      ...storeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Reference για τον πελάτη (για να αυξήσουμε τον μετρητή)
    const customerRef = doc(db, "customers", storeData.customerID);
    batch.update(customerRef, {
      storeCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Εκτέλεση και των δύο ενεργειών ταυτόχρονα
    await batch.commit();
    console.log(`✅ Το κατάστημα ${storeData.storeID} δημιουργήθηκε και ο μετρητής πελάτη αυξήθηκε.`);
  } catch (error) {
    console.error("❌ Error creating store:", error);
    throw error;
  }
};

// DELETE FUNCTIONS

/**
 * Delete a store and all its fire extinguishers and inspections
 */
export const deleteStore = async (storeId: string, customerId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // 1. Εντολή διαγραφής του καταστήματος
    const storeRef = doc(db, "stores", storeId);
    batch.delete(storeRef);

    // 2. Εντολή ΜΕΙΩΣΗΣ του μετρητή στον πελάτη
    const customerRef = doc(db, "customers", customerId);
    batch.update(customerRef, {
      storeCount: increment(-1) // Το Firebase αφαιρεί 1 αυτόματα, χωρίς να χρειάζεται να διαβάσουμε το έγγραφο!
    });

    // Εκτέλεση και των 2 ταυτόχρονα (αν αποτύχει το ένα, ακυρώνονται όλα)
    await batch.commit();

  } catch (error) {
    console.error("❌ Error deleting store:", error);
    throw error;
  }
};

/**
 * Delete a fire extinguisher and all its inspections
 */
export const deleteFireExtinguisher = async (extinguisherId: string): Promise<void> => {
  try {
    console.log("🗑️ Deleting fire extinguisher:", extinguisherId);

    // Get all inspections for this extinguisher
    const inspectionsRef = collection(db, `fire_extinguishers/${extinguisherId}/inspections`);
    const inspectionsSnapshot = await getDocs(inspectionsRef);

    // Delete all inspections
    const batch = writeBatch(db);
    inspectionsSnapshot.docs.forEach((inspDoc) => {
      batch.delete(inspDoc.ref);
    });
    await batch.commit();

    // Delete the extinguisher
    const extinguisherRef = doc(db, "fire_extinguishers", extinguisherId);
    await deleteDoc(extinguisherRef);

    console.log("✅ Fire extinguisher deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting fire extinguisher:", error);
    throw new Error(`Failed to delete fire extinguisher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a customer and all its stores, fire extinguishers, and inspections
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    console.log("🗑️ Deleting customer:", customerId);

    // Get the customer first to know their city
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await getDoc(customerRef);
    const city = customerSnap.exists() ? customerSnap.data().city : null;
    console.log(city);

    // Get all stores for this customer
    const stores = await getStoresByCustomerId(customerId);

    // Delete all stores (which will cascade delete fire extinguishers and inspections)
    for (const store of stores) {
      await deleteStore(store.storeID, store.customerID);
    }

    // Delete the customer
    await deleteDoc(customerRef);
    


    console.log("✅ Customer deleted successfully");
  } catch (error) {
    console.error("❌ Error deleting customer:", error);
    throw new Error(`Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// UPDATE FUNCTIONS

/**
 * Update a customer
 */
export const updateCustomer = async (
  customerId: string,
  data: Partial<Omit<Customer, 'customerID' | 'createdAt'>>
): Promise<void> => {
  try {
    console.log("✏️ Updating customer:", customerId);

    const customerRef = doc(db, "customers", customerId);
    
    await updateDoc(customerRef, {
      ...data,
      updatedAt: serverTimestamp()
    });

    console.log("✅ Customer updated successfully");
  } catch (error) {
    console.error("❌ Error updating customer:", error);
    throw new Error(`Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update a store
 */
export const updateStore = async (
  storeId: string,
  data: Partial<Omit<Store, 'storeID'>>
): Promise<void> => {
  try {
    console.log("✏️ Updating store:", storeId);

    const storeRef = doc(db, "stores", storeId);
    await updateDoc(storeRef, {
      ...data
    });

    console.log("✅ Store updated successfully");
  } catch (error) {
    console.error("❌ Error updating store:", error);
    throw new Error(`Failed to update store: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update a fire extinguisher
 */
export const updateFireExtinguisher = async (
  extinguisherId: string,
  data: Partial<Omit<FireExtinguisher, 'extinguisherID' | 'inspections'>>
): Promise<void> => {
  try {
    console.log("✏️ Updating fire extinguisher:", extinguisherId);

    const extinguisherRef = doc(db, "fire_extinguishers", extinguisherId);
    await updateDoc(extinguisherRef, {
      ...data
    });

    console.log("✅ Fire extinguisher updated successfully");
  } catch (error) {
    console.error("❌ Error updating fire extinguisher:", error);
    throw new Error(`Failed to update fire extinguisher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update inspection active status
 */
export const updateInspectionStatus = async (
  extinguisherId: string,
  inspectionDate: string,
  isActive: boolean
): Promise<void> => {
  try {
    console.log(`✏️ Updating inspection status: ${extinguisherId}/${inspectionDate} to ${isActive}`);

    const inspectionRef = doc(db, `fire_extinguishers/${extinguisherId}/inspections`, inspectionDate);
    await updateDoc(inspectionRef, {
      isActive
    });

    console.log("✅ Inspection status updated successfully");
  } catch (error) {
    console.error("❌ Error updating inspection status:", error);
    throw new Error(`Failed to update inspection status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


/**
 * Εφάπαξ συγχρονισμός (Migration) για να περαστεί ο αριθμός
 * καταστημάτων στους πελάτες. Τρέξτε το μόνο ΜΙΑ φορά!
 */
export const syncAllCustomerStoreCounts = async (): Promise<void> => {
  try {
    console.log("🔄 Ξεκινάει ο συγχρονισμός καταστημάτων...");

    // 1. Παίρνουμε όλα τα καταστήματα με 1 μόνο Query
    const storesRef = collection(db, "stores");
    const storesSnap = await getDocs(storesRef);

    // 2. Φτιάχνουμε ένα "λεξικό" (map) για να μετρήσουμε τα καταστήματα ανά customerID
    const storeCounts: Record<string, number> = {};

    storesSnap.docs.forEach(storeDoc => {
      const data = storeDoc.data();
      const customerID = data.customerID;

      if (customerID) {
        storeCounts[customerID] = (storeCounts[customerID] || 0) + 1;
      }
    });

    console.log(`📊 Υπολογίστηκαν τα καταστήματα για ${Object.keys(storeCounts).length} πελάτες.`);

    // 3. Ενημερώνουμε τους πελάτες χρησιμοποιώντας Batches 
    // (Το Firebase επιτρέπει μέχρι 500 εγγραφές ανά Batch)
    const customerIds = Object.keys(storeCounts);
    const chunkSize = 400; // Κρατάμε ένα περιθώριο ασφαλείας κάτω από τα 500

    for (let i = 0; i < customerIds.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = customerIds.slice(i, i + chunkSize);

      chunk.forEach(customerId => {
        const customerRef = doc(db, "customers", customerId);
        batch.update(customerRef, {
          storeCount: storeCounts[customerId]
        });
      });

      await batch.commit();
      console.log(`✅ Ολοκληρώθηκε το batch ${Math.floor(i / chunkSize) + 1}`);
    }

    console.log("🎉 Ο συγχρονισμός ολοκληρώθηκε με επιτυχία!");
  } catch (error) {
    console.error("❌ Σφάλμα κατά τον συγχρονισμό:", error);
    throw new Error("Αποτυχία συγχρονισμού καταστημάτων.");
  }
};

