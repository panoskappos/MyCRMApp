import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// Καθαρά imports των services στην κορυφή
import { CitySelect } from "../components/CitySelect";
import { getCustomerById, updateCustomer, createCustomer } from "../services/customerService";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import { BackButton } from "../components/ui/BackButton";
import { useCustomersCache } from "../context/CustomersCacheContext";

export const NewCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const { updateCustomerInCache } = useCustomersCache();

  // Form state
  const [formData, setFormData] = useState({
    customerID: "",
    name: "",
    taxNumber: "",
    city: "",
    address: "",
    mobile: "",
    land_line: "",
    email: "",
    comments: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load customer data if in edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      const loadCustomer = async () => {
        try {
          setLoading(true);
          const customerData = await getCustomerById(editId);
          console.log(customerData);

          if (customerData) {
            setFormData({
              customerID: customerData.customerID,
              name: String(customerData.name || ""),
              taxNumber: String(customerData.taxNumber || ""),
              city: String(customerData.city || ""),
              address: String(customerData.address || ""),
              mobile: String(customerData.mobile || ""),
              land_line: String(customerData.land_line || ""),
              email: String(customerData.email || ""),
              comments: String(customerData.comments || ""),
              isActive: customerData.isActive,
            });
          } else {
            setError("Ο πελάτης δεν βρέθηκε");
          }
        } catch (err) {
          console.error("Error loading customer:", err);
          setError("Σφάλμα κατά τη φόρτωση του πελάτη");
        } finally {
          setLoading(false);
        }
      };
      loadCustomer();
    }
  }, [isEditMode, editId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Κωδικός Πελάτη (Υποχρεωτικός μόνο στη δημιουργία)
    if (!isEditMode) {
      if (!formData.customerID.trim()) {
        newErrors.customerID = "Ο κωδικός πελάτη είναι υποχρεωτικός";
      } else if (!/^\d{4}$/.test(formData.customerID)) {
        newErrors.customerID = "Ο κωδικός πελάτη πρέπει να είναι 4 ψηφία";
      }
    }

    // 2. Όνομα επιχείρησης (Υποχρεωτικό)
    if (!formData.name.trim()) {
      newErrors.name = "Το όνομα επιχείρησης είναι υποχρεωτικό";
    }

    // 3. Πόλη (Υποχρεωτική)
    if (!formData.city.trim()){
      newErrors.city = "Η πόλη επιχείρησης είναι υποχρεωτική";
    }

    // 4. Διεύθυνση (Υποχρεωτική)
    if (!formData.address.trim()) {
      newErrors.address = "Η διεύθυνση είναι υποχρεωτική";
    }

    // 5. ΑΦΜ (Υποχρεωτικό)
    if (!formData.taxNumber.trim()) {
      newErrors.taxNumber = "Το ΑΦΜ είναι υποχρεωτικό";
    } else if (!/^\d{9}$/.test(formData.taxNumber.replace(/\s/g, ""))) {
      newErrors.taxNumber = "Το ΑΦΜ πρέπει να είναι 9 ψηφία";
    }

    // 6. Κινητό Τηλέφωνο (Υποχρεωτικό)
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Το κινητό τηλέφωνο είναι υποχρεωτικό";
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\s/g, ""))) {
      newErrors.mobile = "Το κινητό τηλέφωνο πρέπει να είναι 10 ψηφία";
    }

    // 7. Email (Υποχρεωτικό)
    if (!formData.email.trim()) {
      newErrors.email = "Το email είναι υποχρεωτικό";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Μη έγκυρη διεύθυνση email";
    }

    // Σημείωση: Το land_line και τα comments παραλείπονται επίτηδες για να είναι προαιρετικά.

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Προετοιμασία των δεδομένων (αφαίρεση περιττών κενών)
      const cleanedData = {
        name: formData.name.trim(),
        taxNumber: formData.taxNumber.trim() || null,
        city: formData.city.trim() || null,
        address: formData.address.trim() || null,
        mobile: formData.mobile.trim() || null,
        land_line: formData.land_line.trim() || null,
        email: formData.email.trim() || null,
        comments: formData.comments.trim() || null,
        isActive: formData.isActive,
      };

      if (isEditMode && editId) {
        // Χρήση της έτοιμης συνάρτησης από το Service
        await updateCustomer(editId, cleanedData);
        updateCustomerInCache(editId, cleanedData);
        alert(`Ο πελάτης "${formData.name}" ενημερώθηκε επιτυχώς!`);
        navigate("/app/customers");
      } else {
        // Χρήση της ΝΕΑΣ συνάρτησης από το Service (που προσθέτει και τους μετρητές)
        await createCustomer({
          customerID: formData.customerID,
          ...cleanedData
        });

        // Show success dialog and ask if they want to add a store
        const wantToAddStore = window.confirm(
          `Ο πελάτης "${formData.name}" δημιουργήθηκε επιτυχώς!\n\nΘέλετε να προσθέσετε ένα κατάστημα;`
        );

        if (wantToAddStore) {
          navigate(`/app/customers/${formData.customerID}/stores/new`);
        } else {
          navigate("/app/customers");
        }
      }
    } catch (err: any) {
      console.error("Error saving customer:", err);
      // Ελέγχουμε αν το σφάλμα είναι το custom error που πετάει το service μας για διπλότυπο κωδικό
      if (err.message && err.message.includes('υπάρχει ήδη')) {
        setError(err.message);
        setErrors({ customerID: "Ο κωδικός υπάρχει ήδη" });
      } else {
        setError("Σφάλμα κατά την αποθήκευση του πελάτη");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <BackButton to="/app/customers" label="Επιστροφή στους πελάτες" className="mb-6" />

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isEditMode ? "Επεξεργασία πελάτη" : "Δημιουργία νέου πελάτη"}
            </h1>
            <p className="text-gray-600 text-sm">
              {isEditMode ? "Ενημερώστε τα στοιχεία του πελάτη" : "Είναι γρήγορο και εύκολο."}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {/* 1. Επωνυμία (Υποχρεωτικό) */}
            <Input
              name="name"
              label="Επωνυμία επιχείρησης *"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="π.χ. Παπαδόπουλος Α.Ε."
              error={errors.name}
            />

            {/* 2. ΑΦΜ (Υποχρεωτικό) */}
            <Input
              name="taxNumber"
              label="ΑΦΜ *"
              value={formData.taxNumber}
              onChange={handleInputChange}
              placeholder="9 ψηφία"
              maxLength={9}
              error={errors.taxNumber}
            />

            {/* 3. Κωδικός Πελάτη (Υποχρεωτικό) */}
            <div>
              <Input
                name="customerID"
                label="Κωδικός πελάτη *"
                value={formData.customerID}
                onChange={handleInputChange}
                placeholder="4 ψηφία"
                maxLength={4}
                error={errors.customerID}
                disabled={isEditMode}
                readOnly={isEditMode}
              />
              {isEditMode && (
                <p className="text-xs text-gray-500 mt-1">Ο κωδικός πελάτη δεν μπορεί να αλλάξει</p>
              )}
            </div>

            {/* 4. Πόλη (Υποχρεωτικό) - Προσθέτουμε χειροκίνητα το label γιατί δεν είναι Input */}
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Πόλη *
              </label>
              <CitySelect
                value={formData.city}
                onChange={(city) => setFormData(prev => ({ ...prev, city }))}
                placeholder="Επιλέξτε πόλη"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            {/* 5. Διεύθυνση (Υποχρεωτικό) */}
            <Input 
              name="address"
              label="Διεύθυνση *"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Οδός και αριθμός"
              type="text"
              error={errors.address}
            />
            
            {/* 6. Κινητό (Υποχρεωτικό) */}
            <Input
              name="mobile"
              label="Κινητό τηλέφωνο *"
              value={formData.mobile}
              onChange={handleInputChange}
              placeholder="10 ψηφία"
              type="tel"
              maxLength={10}
              error={errors.mobile}
            />

            {/* 7. Σταθερό (Προαιρετικό - Χωρίς αστεράκι) */}
            <Input
              name="land_line"
              label="Σταθερό τηλέφωνο"
              value={formData.land_line}
              onChange={handleInputChange}
              placeholder="10 ψηφία"
              type="tel"
              maxLength={10}
            />

            {/* 8. Email (Υποχρεωτικό) */}
            <Input
              name="email"
              label="Email *"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="π.χ. info@example.com"
              type="email"
              error={errors.email}
            />

            {/* 9. Σχόλια (Προαιρετικό) - Προσθέτουμε χειροκίνητα το label */}
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Σχόλια
              </label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                placeholder="Προσθέστε τυχόν επιπλέον πληροφορίες..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center py-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-slate-600 focus:ring-slate-400 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 cursor-pointer select-none">
                Ενεργός πελάτης
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3 text-base rounded-xl shadow-sm shadow-blue-500/25 transition-all"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 mr-2" />
                  Αποθήκευση...
                </>
              ) : (
                isEditMode ? 'Ενημέρωση' : 'Εγγραφή'
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/app/customers")}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Ακύρωση
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Συμβουλή:</span> Συμπληρώστε όσο το δυνατόν περισσότερα στοιχεία για καλύτερη διαχείριση
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewCustomer;
