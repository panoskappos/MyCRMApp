import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { BackButton } from "../components/ui/BackButton";
import type { Customer, Store, FireExtinguisher } from "../types";

type MaintenanceType = "ΕΤΗΣΙΑ" | "5-ΕΤΗΣ" | "10-ΕΤΗΣ";

interface ExtinguisherInspectionData {
  extinguisherID: string;
  type: string;
  shellNumber: string;
  manufacturingYear: string;
  aaNumber: number | null;
  maintenanceType: MaintenanceType; // Individual maintenance type per extinguisher
  // New fields
  lastRefillDate: string;
  repairKitLock: boolean;
  sale: boolean;
  unsuitable: boolean;
  // Inspection checkboxes per extinguisher
  lock: boolean;
  safetyPin: boolean;
  dischargeHose: boolean; // Renamed from hose
  pressureGauge: boolean;
}

export const NewInspection: React.FC = () => {
  const { customerId, storeId } = useParams<{ customerId: string; storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [extinguishersData, setExtinguishersData] = useState<ExtinguisherInspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields for all extinguishers
  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split("T")[0],
    responsible: "",
  });

  // Get selected extinguisher IDs from URL
  const selectedExtinguisherIds = searchParams.get('extinguishers')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    const loadData = async () => {
      if (!customerId || !storeId) {
        setError("Δεν βρέθηκαν απαραίτητα στοιχεία");
        setLoading(false);
        return;
      }

      if (selectedExtinguisherIds.length === 0) {
        setError("Δεν επιλέχθηκαν πυροσβεστήρες");
        setLoading(false);
        return;
      }

      try {
        const { getCustomerById, getStoreById } = await import("../services/customerService");

        const [customerData, storeData] = await Promise.all([
          getCustomerById(customerId),
          getStoreById(storeId),
        ]);

        if (!customerData || !storeData) {
          setError("Δεν βρέθηκαν ο πελάτης ή το κατάστημα");
          setLoading(false);
          return;
        }

        setCustomer(customerData);
        setStore(storeData);

        // Load selected extinguishers
        const loadedExtinguishers: ExtinguisherInspectionData[] = [];
        const passedExtinguishers = location.state?.selectedExtinguishers as FireExtinguisher[] | undefined;

        if (passedExtinguishers && passedExtinguishers.length > 0) {
          for (const data of passedExtinguishers) {
            loadedExtinguishers.push({
              extinguisherID: data.extinguisherID,
              type: data.type || "",
              shellNumber: data.shellNumber || "",
              manufacturingYear: data.manufacturingYear || "",
              aaNumber: data.aaNumber || null,
              maintenanceType: "ΕΤΗΣΙΑ" as MaintenanceType, // Default to annual
              // New fields with default values
              lastRefillDate: "",
              repairKitLock: false,
              sale: false,
              unsuitable: false,
              // Inspection checkboxes
              lock: false,
              safetyPin: false,
              dischargeHose: false,
              pressureGauge: false,
            });
          }
        } else {
          for (const extId of selectedExtinguisherIds) {
            const extRef = doc(db, "fire_extinguishers", extId);
            const extDoc = await getDoc(extRef);

            if (extDoc.exists()) {
              const data = extDoc.data() as FireExtinguisher;
              loadedExtinguishers.push({
                extinguisherID: extId,
                type: data.type || "",
                shellNumber: data.shellNumber || "",
                manufacturingYear: data.manufacturingYear || "",
                aaNumber: data.aaNumber || null,
                maintenanceType: "ΕΤΗΣΙΑ" as MaintenanceType, // Default to annual
                // New fields with default values
                lastRefillDate: "",
                repairKitLock: false,
                sale: false,
                unsuitable: false,
                // Inspection checkboxes
                lock: false,
                safetyPin: false,
                dischargeHose: false,
                pressureGauge: false,
              });
            }
          }
        }

        loadedExtinguishers.sort((a, b) =>
          a.extinguisherID.localeCompare(b.extinguisherID));
        setExtinguishersData(loadedExtinguishers);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Αποτυχία φόρτωσης δεδομένων");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId, storeId, selectedExtinguisherIds.join(',')]);

  // Calculate recheckDate for each extinguisher based on their individual maintenance type
  const calculateRecheckDate = (maintenanceType: MaintenanceType): string => {
    if (!formData.inspectionDate) return "";

    const inspDate = new Date(formData.inspectionDate);
    let recheckDate = new Date(inspDate);

    switch (maintenanceType) {
      case "ΕΤΗΣΙΑ":
        recheckDate.setFullYear(inspDate.getFullYear() + 1);
        break;
      case "5-ΕΤΗΣ":
        recheckDate.setFullYear(inspDate.getFullYear() + 5);
        break;
      case "10-ΕΤΗΣ":
        recheckDate.setFullYear(inspDate.getFullYear() + 10);
        break;
    }

    return recheckDate.toISOString().split("T")[0];
  };

  const handleCommonFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (extinguisherID: string, field: keyof Pick<ExtinguisherInspectionData, 'lock' | 'safetyPin' | 'dischargeHose' | 'pressureGauge' | 'repairKitLock' | 'sale' | 'unsuitable'>) => {
    setExtinguishersData(prev =>
      prev.map(ext =>
        ext.extinguisherID === extinguisherID
          ? { ...ext, [field]: !ext[field] }
          : ext
      )
    );
  };

  const handleMaintenanceTypeChange = (extinguisherID: string, maintenanceType: MaintenanceType) => {
    setExtinguishersData(prev =>
      prev.map(ext =>
        ext.extinguisherID === extinguisherID
          ? { ...ext, maintenanceType }
          : ext
      )
    );
  };

  const handleLastRefillDateChange = (extinguisherID: string, date: string) => {
    setExtinguishersData(prev =>
      prev.map(ext =>
        ext.extinguisherID === extinguisherID
          ? { ...ext, lastRefillDate: date }
          : ext
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.inspectionDate) {
      setError("Η ημερομηνία ελέγχου είναι υποχρεωτική");
      return;
    }

    if (!customer || !store) {
      setError("Δεν βρέθηκαν ο πελάτης ή το κατάστημα");
      return;
    }

    if (extinguishersData.length === 0) {
      setError("Δεν υπάρχουν πυροσβεστήρες για έλεγχο");
      return;
    }

    setSaving(true);

    try {
      const batch = writeBatch(db);

      // Create inspection for each extinguisher
      for (const ext of extinguishersData) {
        const inspectionRef = doc(
          db,
          `fire_extinguishers/${ext.extinguisherID}/inspections`,
          formData.inspectionDate
        );

        batch.set(inspectionRef, {
          inspectionDate: formData.inspectionDate,
          recheckDate: calculateRecheckDate(ext.maintenanceType),
          customer: customer.name,
          responsible: formData.responsible.trim() || null,
          maintenanceType: ext.maintenanceType,
          status: "COMPLETED",
          // New fields
          lastRefillDate: ext.lastRefillDate || null,
          repairKitLock: ext.repairKitLock,
          sale: ext.sale,
          unsuitable: ext.unsuitable,
          // Individual checkbox values for this extinguisher
          lock: ext.lock,
          safetyPin: ext.safetyPin,
          dischargeHose: ext.dischargeHose,
          pressureGauge: ext.pressureGauge,
        });
      }

      await batch.commit();

      console.log(`✅ Successfully created ${extinguishersData.length} inspections`);

      // Navigate back to previous page
      navigate(-1);
    } catch (err) {
      console.error("Error creating inspections:", err);
      setError("Αποτυχία δημιουργίας ελέγχων. Παρακαλώ δοκιμάστε ξανά.");
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Φόρτωση..." />;
  }

  if (!customer || !store || extinguishersData.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600">{error || "Δεν βρέθηκαν πυροσβεστήρες"}</p>
            <Button
              onClick={() => navigate(-1)}
              className="mt-4"
            >
              Επιστροφή
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="mb-4">
        <BackButton />
      </div>

      <Card>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Νέος Έλεγχος Πυροσβεστήρων
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Πελάτης: <span className="font-semibold">{customer.name}</span> |
              Κατάστημα: <span className="font-semibold">{store.storeName}</span> |
              Πυροσβεστήρες: <span className="font-semibold">{extinguishersData.length}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common Fields */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ημερομηνία Ελέγχου <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="inspectionDate"
                    value={formData.inspectionDate}
                    onChange={handleCommonFieldChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Υπεύθυνος Ελέγχου
                  </label>
                  <Input
                    type="text"
                    name="responsible"
                    value={formData.responsible}
                    onChange={handleCommonFieldChange}
                    placeholder="Υπεύθυνος Ελέγχου"
                  />
                </div>
              </div>
            </div>

            {/* Extinguishers Table */}
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-700 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Α/Α</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Πυροσβεστήρας</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">S/N</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Κέλυφος</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Έτος<br />Κατασκευής</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase">Έτος<br />τελευταιάς<br />αναγόμωσης</th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase bg-blue-600">Τύπος<br />Συντήρησης</th>
                    <th colSpan={3} className="px-3 py-2 text-center text-xs font-bold uppercase bg-green-700">Συντήρηση</th>
                    <th colSpan={5} className="px-3 py-2 text-center text-xs font-bold uppercase bg-amber-600">Αντικατάστηση<br /> Εξαρτήματα</th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase bg-slate-700">Πώληση</th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase bg-purple-600">Ακατάληλος</th>
                  </tr>
                  <tr className="bg-gray-100 text-gray-700 text-xs">
                    <th colSpan={6}></th>
                    <th className="px-2 py-1 border-l border-gray-400"></th>
                    <th className="px-2 py-1 border-l border-gray-400 font-semibold">ΕΤ.</th>
                    <th className="px-2 py-1 font-semibold">5ΕΤ</th>
                    <th className="px-2 py-1 font-semibold">10ΕΤ</th>
                    <th className="px-2 py-1 border-l border-gray-400 font-semibold">Σωλήνας<br />εκτόξευσης</th>
                    <th className="px-2 py-1 font-semibold">Κλείστρο</th>
                    <th className="px-2 py-1 font-semibold">Μανόμετρο</th>
                    <th className="px-2 py-1 font-semibold">Ασφαλιστικό</th>
                    <th className="px-2 py-1 font-semibold">Κιτ επισκευής<br />Κλείστρου</th>
                    <th className="px-2 py-1 border-l border-gray-400"></th>
                    <th className="px-2 py-1 border-l border-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extinguishersData.map((ext, index) => {
                    const isAnnual = ext.maintenanceType === "ΕΤΗΣΙΑ";
                    const is5Year = ext.maintenanceType === "5-ΕΤΗΣ";
                    const is10Year = ext.maintenanceType === "10-ΕΤΗΣ";
                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                    return (
                      <tr key={ext.extinguisherID} className={rowBg}>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-700">{index + 1}</td>
                        <td className="px-3 py-2 text-sm text-gray-800">{ext.type}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{ext.extinguisherID}</td>
                        <td className="px-3 py-2 text-sm text-gray-800">{ext.shellNumber}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-800">{ext.manufacturingYear}</td>

                        {/* Last Refill Date Input */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={ext.lastRefillDate}
                            onChange={(e) => handleLastRefillDateChange(ext.extinguisherID, e.target.value)}
                            placeholder="YYYY"
                            className="w-16 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        </td>

                        {/* Maintenance Type Selector */}
                        <td className="px-2 py-2 bg-blue-50 border-l border-gray-300">
                          <select
                            value={ext.maintenanceType}
                            onChange={(e) => handleMaintenanceTypeChange(ext.extinguisherID, e.target.value as MaintenanceType)}
                            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                          >
                            <option value="ΕΤΗΣΙΑ">ΕΤ.</option>
                            <option value="5-ΕΤΗΣ">5ΕΤ</option>
                            <option value="10-ΕΤΗΣ">10ΕΤ</option>
                          </select>
                        </td>

                        {/* ΣΥΝΤΗΡΗΣΗ columns */}
                        <td className="px-2 py-2 text-center bg-green-50 border-l border-gray-300">
                          {isAnnual && <span className="inline-block bg-green-500 text-white rounded-full w-4 h-4 text-xs leading-4 font-bold">✓</span>}
                        </td>
                        <td className="px-2 py-2 text-center bg-green-50">
                          {is5Year && <span className="inline-block bg-green-500 text-white rounded-full w-4 h-4 text-xs leading-4 font-bold">✓</span>}
                        </td>
                        <td className="px-2 py-2 text-center bg-green-50">
                          {is10Year && <span className="inline-block bg-green-500 text-white rounded-full w-4 h-4 text-xs leading-4 font-bold">✓</span>}
                        </td>

                        {/* ΑΝΤΙΚΑΤΑΣΤΑΣΗ ΕΞΑΡΤ. checkboxes */}
                        <td className="px-2 py-2 text-center bg-amber-50 border-l border-gray-300">
                          <input
                            type="checkbox"
                            checked={ext.dischargeHose}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'dischargeHose')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 text-center bg-amber-50">
                          <input
                            type="checkbox"
                            checked={ext.lock}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'lock')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 text-center bg-amber-50">
                          <input
                            type="checkbox"
                            checked={ext.pressureGauge}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'pressureGauge')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 text-center bg-amber-50">
                          <input
                            type="checkbox"
                            checked={ext.safetyPin}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'safetyPin')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 text-center bg-amber-50">
                          <input
                            type="checkbox"
                            checked={ext.repairKitLock}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'repairKitLock')}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                          />
                        </td>

                        {/* Sale checkbox */}
                        <td className="px-2 py-2 text-center bg-red-50 border-l border-gray-300">
                          <input
                            type="checkbox"
                            checked={ext.sale}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'sale')}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </td>

                        {/* Unsuitable checkbox */}
                        <td className="px-2 py-2 text-center bg-purple-50 border-l border-gray-300">
                          <input
                            type="checkbox"
                            checked={ext.unsuitable}
                            onChange={() => handleCheckboxChange(ext.extinguisherID, 'unsuitable')}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={saving}
              >
                Ακύρωση
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm shadow-blue-500/20"
                disabled={saving}
              >
                {saving ? "Αποθήκευση..." : `Καταχώρηση Ελέγχου (${extinguishersData.length} πυροσβ.)`}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default NewInspection;
