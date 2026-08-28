import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { CitySelect } from "../components/CitySelect";
import type { Customer } from "../types";

export const NewStore: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    storeID: "",
    storeName: "",
    city: "",
    address: "",
    mobile: "",
    land_line: "",
    email: "",
  });

  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) {
        setError("Δεν βρέθηκε κωδικός πελάτη");
        setLoading(false);
        return;
      }

      try {
        const customerRef = doc(db, "customers", customerId);
        const customerDoc = await getDoc(customerRef);

        if (!customerDoc.exists()) {
          setError("Ο πελάτης δεν βρέθηκε");
          setLoading(false);
          return;
        }

        const customerData = customerDoc.data() as Customer;
        setCustomer({
          customerID: customerDoc.id,
          name: customerData.name,
          taxNumber: customerData.taxNumber,
          city: customerData.city,
          address: customerData.address,
          mobile: customerData.mobile,
          land_line: customerData.land_line,
          email: customerData.email,
          comments: customerData.comments,
          isActive: customerData.isActive,
        });

        // Load store data in edit mode or generate new ID
        if (isEditMode && editId) {
          const { getStoreById } = await import('../services/customerService');
          const storeData = await getStoreById(editId);
          if (storeData) {
            setFormData({
              storeID: storeData.storeID,
              storeName: String(storeData.storeName || ""),
              city: String(storeData.city || ""),
              address: String(storeData.address || ""),
              mobile: String(storeData.mobile || ""),
              land_line: String(storeData.land_line || ""),
              email: String(storeData.email || ""),
            });
          } else {
            setError("Το κατάστημα δεν βρέθηκε");
          }
        } else {
          // Generate next available store ID
          const nextStoreID = await getNextStoreID(customerId);
          setFormData(prev => ({
            ...prev,
            storeID: nextStoreID,
            storeName: String(customerData.name || ""),
            city: String(customerData.city || ""),
            address: String(customerData.address || ""),
            mobile: String(customerData.mobile || ""),
            land_line: String(customerData.land_line || ""),
            email: String(customerData.email || ""),
          }));
        }
      } catch (err) {
        console.error("Error loading customer:", err);
        setError("Αποτυχία φόρτωσης πελάτη");
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId, isEditMode, editId]);

  const getNextStoreID = async (customerID: string): Promise<string> => {
    try {
      // Query all stores for this customer
      const storesRef = collection(db, "stores");
      const q = query(storesRef, where("customerID", "==", customerID));
      const storesSnapshot = await getDocs(q);

      if (storesSnapshot.empty) {
        // First store: customerID + "01"
        return `${customerID}01`;
      }

      // Find the highest store number
      let maxNumber = 0;
      storesSnapshot.docs.forEach((storeDoc) => {
        const storeID = storeDoc.id;
        // Extract last 2 digits
        const numberPart = parseInt(storeID.slice(-2), 10);
        if (!isNaN(numberPart) && numberPart > maxNumber) {
          maxNumber = numberPart;
        }
      });

      // Increment and pad with zero
      const nextNumber = (maxNumber + 1).toString().padStart(2, "0");
      return `${customerID}${nextNumber}`;
    } catch (err) {
      console.error("Error generating store ID:", err);
      throw err;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.storeName.trim()) {
      setError("Το όνομα καταστήματος είναι υποχρεωτικό");
      return;
    }

    if (!customer) {
      setError("Δεν βρέθηκε ο πελάτης");
      return;
    }

    setSaving(true);

    try {
      const { updateStore, createStore } = await import('../services/customerService');

      if (isEditMode && editId) {
        // Update existing store
        await updateStore(editId, {
          storeName: formData.storeName.trim(),
          city: formData.city.trim() || null,
          address: formData.address.trim() || null,
          mobile: formData.mobile.trim() || null,
          land_line: formData.land_line.trim() || null,
          email: formData.email.trim() || null,
        });

        console.log("✅ Store updated successfully:", editId);
        alert("Το κατάστημα ενημερώθηκε επιτυχώς!");
        navigate(`/app/customers/${customer.customerID}/stores`);
      } else {
        // Διπλός έλεγχος για να αποφύγουμε διπλότυπα ID
        const storeRef = doc(db, "stores", formData.storeID);
        const existingStore = await getDoc(storeRef);

        if (existingStore.exists()) {
          setError("Αυτό το ID καταστήματος υπάρχει ήδη. Παρακαλώ δοκιμάστε ξανά.");
          const newStoreID = await getNextStoreID(customer.customerID);
          setFormData(prev => ({ ...prev, storeID: newStoreID }));
          setSaving(false);
          return;
        }

        // Χρήση της νέας συνάρτησης createStore που ενημερώνει και τους μετρητές
        await createStore({
          storeID: formData.storeID,
          customerID: customer.customerID,
          storeName: formData.storeName.trim(),
          city: formData.city.trim() || null,
          address: formData.address.trim() || null,
          mobile: formData.mobile.trim() || null,
          land_line: formData.land_line.trim() || null,
          email: formData.email.trim() || null,
          taxNumber: customer.taxNumber || null,
        } as any);

        console.log("✅ Store created successfully:", formData.storeID);
        navigate(`/app/customers/${customer.customerID}/stores`);
      }
    } catch (err) {
      console.error("Error saving store:", err);
      setError("Αποτυχία αποθήκευσης καταστήματος. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Φόρτωση..." />;
  }

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600">{error || "Ο πελάτης δεν βρέθηκε"}</p>
            <Button
              onClick={() => navigate("/app/customers")}
              className="mt-4"
            >
              Επιστροφή στους Πελάτες
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Επεξεργασία Καταστήματος" : "Νέο Κατάστημα"}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Προσθήκη καταστήματος για: <span className="font-semibold">{customer.name}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Κωδικός Καταστήματος"
                type="text"
                name="storeID"
                value={formData.storeID}
                readOnly
                className="bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                {isEditMode ? "Ο κωδικός δεν μπορεί να αλλάξει" : "Αυτόματη δημιουργία"}
              </p>
            </div>

            <Input
              label="Όνομα Καταστήματος *"
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              placeholder="π.χ. Κεντρικό Κατάστημα"
              required
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Πόλη
              </label>
              <CitySelect
                value={formData.city}
                onChange={(city) => setFormData(prev => ({ ...prev, city }))}
                placeholder="Επιλέξτε πόλη"
              />
            </div>

            <Input
              label="Διεύθυνση"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="π.χ. Λεωφόρος Συγγρού 123"
            />

            <Input
              label="Κινητό Τηλέφωνο"
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10 ψηφία"
              maxLength={10}
            />

            <Input
              label="Σταθερό Τηλέφωνο"
              type="tel"
              name="land_line"
              value={formData.land_line}
              onChange={handleChange}
              placeholder="10 ψηφία"
              maxLength={10}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="π.χ. store@example.com"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/app/customers/${customer.customerID}/stores`)}
                className="flex-1"
                disabled={saving}
              >
                Ακύρωση
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
              >
                {saving ? "Αποθήκευση..." : (isEditMode ? "Ενημέρωση" : "Εγγραφή")}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default NewStore;
