import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { BackButton } from "../components/ui/BackButton";
import type { Customer, Store } from "../types";

export const NewFireExtinguisher: React.FC = () => {
  const { customerId, storeId } = useParams<{ customerId: string; storeId: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    extinguisherID: "",
    type: "",
    shellNumber: "",
    manufacturer: "",
    manufacturingYear: "",
    sold: false,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!customerId || !storeId) {
        setError("Δεν βρέθηκαν απαραίτητα στοιχεία");
        setLoading(false);
        return;
      }

      try {
        const { getCustomerById, getStoreById, getFireExtinguishersByStoreId } = await import("../services/customerService");

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

        // Load extinguisher data if in edit mode
        if (isEditMode && editId) {
          const extinguishers = await getFireExtinguishersByStoreId(storeId!);
          const extinguisher = extinguishers.find(ext => ext.extinguisherID === editId);

          if (extinguisher) {
            setFormData({
              extinguisherID: extinguisher.extinguisherID,
              type: String(extinguisher.type || ""),
              shellNumber: String(extinguisher.shellNumber || ""),
              manufacturer: String(extinguisher.manufacturer || ""),
              manufacturingYear: String(extinguisher.manufacturingYear || ""),
              sold: extinguisher.sold || false,
            });
          } else {
            setError("Ο πυροσβεστήρας δεν βρέθηκε");
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Αποτυχία φόρτωσης δεδομένων");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId, storeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.extinguisherID.trim()) {
      setError("Ο αριθμός σειράς (S/N) είναι υποχρεωτικός");
      return;
    }

    if (!customer || !store) {
      setError("Δεν βρέθηκαν ο πελάτης ή το κατάστημα");
      return;
    }

    setSaving(true);

    try {
      if (isEditMode && editId) {
        // Update existing extinguisher
        const { updateFireExtinguisher } = await import('../services/customerService');
        await updateFireExtinguisher(editId, {
          type: formData.type.trim() || null,
          shellNumber: formData.shellNumber.trim() || null,
          manufacturer: formData.manufacturer.trim() || null,
          manufacturingYear: formData.manufacturingYear.trim() || null,
          sold: formData.sold,
          storeID: storeId!,
          customerID: customerId!,
          serialNumber: editId,
        });

        console.log("✅ Fire extinguisher updated successfully");
        alert("Ο πυροσβεστήρας ενημερώθηκε επιτυχώς!");
        navigate(`/app/customers/${customerId}/stores/${storeId}/extinguishers`);
      } else {
        const extinguisherRef = doc(db, "fire_extinguishers", formData.extinguisherID.trim());

        await setDoc(extinguisherRef, {
          extinguisherID: formData.extinguisherID.trim(),
          storeID: storeId,
          customerID: customerId,
          serialNumber: formData.extinguisherID.trim(), // Same as extinguisherID
          type: formData.type.trim() || null,
          shellNumber: formData.shellNumber.trim() || null,
          manufacturer: formData.manufacturer.trim() || null,
          manufacturingYear: formData.manufacturingYear.trim() || null,
          aaNumber: null,
          sold: formData.sold,
          inspections: {}, // Empty inspections object initially
        });

        console.log("✅ Fire extinguisher created successfully");

        // Navigate back to extinguishers list
        navigate(`/app/customers/${customerId}/stores/${storeId}/extinguishers`);
      }
    } catch (err) {
      console.error("Error creating fire extinguisher:", err);
      setError("Αποτυχία δημιουργίας πυροσβεστήρα. Παρακαλώ δοκιμάστε ξανά.");
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Φόρτωση..." />;
  }

  if (!customer || !store) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600">{error || "Δεν βρέθηκαν τα απαραίτητα δεδομένα"}</p>
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
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <BackButton />
      </div>

      <Card>
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Επεξεργασία Πυροσβεστήρα" : "Νέος Πυροσβεστήρας"}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Πελάτης: <span className="font-semibold">{customer.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Κατάστημα: <span className="font-semibold">{store.storeName}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Extinguisher ID (S/N) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αριθμός Σειράς (S/N) <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="extinguisherID"
                value={formData.extinguisherID}
                onChange={handleChange}
                placeholder="π.χ. 003545"
                required={!isEditMode}
                disabled={isEditMode}
                readOnly={isEditMode}
                className={isEditMode ? "bg-gray-50" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isEditMode ? "Ο αριθμός σειράς δεν μπορεί να αλλάξει" : "Μοναδικός αριθμός σειράς του πυροσβεστήρα"}
              </p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Τύπος Πυροσβεστήρα
              </label>
              <Input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                placeholder="π.χ. ΞΚ 12kg OP, CO2 5lt"
              />
              <p className="text-xs text-gray-500 mt-1">
                Τύπος και χωρητικότητα (π.χ. ΞΚ 12kg, CO2 5lt)
              </p>
            </div>

            {/* Shell Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αριθμός Κελύφους
              </label>
              <Input
                type="text"
                name="shellNumber"
                value={formData.shellNumber}
                onChange={handleChange}
                placeholder="π.χ. CE0437"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατασκευαστής
              </label>
              <Input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="π.χ. MBK, VICTORIA"
              />
            </div>

            {/* Manufacturing Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Έτος Κατασκευής
              </label>
              <Input
                type="text"
                name="manufacturingYear"
                value={formData.manufacturingYear}
                onChange={handleChange}
                placeholder="π.χ. 2021, 2024, 2026"
                maxLength={4}
              />
            </div>

            {/* Sold Checkbox */}
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sold"
                  checked={formData.sold}
                  onChange={handleChange}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-400 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Πωλήθηκε</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Επιλέξτε αν ο πυροσβεστήρας έχει πωληθεί
              </p>
            </div>

            {/* Submit Buttons */}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? "Αποθήκευση..." : (isEditMode ? "Ενημέρωση Πυροσβεστήρα" : "Δημιουργία Πυροσβεστήρα")}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default NewFireExtinguisher;
