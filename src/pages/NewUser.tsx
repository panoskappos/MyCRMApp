import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import { BackButton } from "../components/ui/BackButton";

export const NewUser: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // State για την αποθήκευση και εμφάνιση του παραγόμενου link
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    firstname: "",
    lastname: "",
    phone: "",
    place: "",
    role: "delivery", 
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Η συνάρτηση παραγωγής μοναδικού Token ---
  const generateUniqueToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  useEffect(() => {
    if (isEditMode && editId) {
      const loadUser = async () => {
        try {
          setLoading(true);
          const userRef = doc(db, "users_roles", editId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setFormData({
              email: String(userData.email || ""),
              firstname: String(userData.firstname || ""),
              lastname: String(userData.lastname || ""),
              phone: String(userData.phone || ""),
              place: String(userData.place || ""),
              role: String(userData.role || "delivery"),
            });
          } else {
            setError("Ο χρήστης δεν βρέθηκε");
          }
        } catch (err) {
          console.error("Error loading user:", err);
          setError("Σφάλμα κατά τη φόρτωση του χρήστη");
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    }
  }, [isEditMode, editId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    if (!formData.email.trim()) {
      newErrors.email = "Το email είναι υποχρεωτικό";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Μη έγκυρη διεύθυνση email";
    }

    if (!formData.firstname.trim()) {
      newErrors.firstname = "Το όνομα είναι υποχρεωτικό";
    }

    if (!formData.lastname.trim()) {
      newErrors.lastname = "Το επώνυμο είναι υποχρεωτικό";
    }

    if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Το τηλέφωνο πρέπει να είναι 10 ψηφία";
    }

    if (!formData.place.trim()) {
      newErrors.place = "Η τοποθεσία/πόλη είναι υποχρεωτική";
    }

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
      setGeneratedLink(null); // Καθαρισμός προηγούμενου link αν υπάρχει

      const normalizedEmail = formData.email.trim().toLowerCase();

      if (isEditMode && editId) {
        // --- ΕΠΕΞΕΡΓΑΣΙΑ ΥΠΑΡΧΟΝΤΟΣ ΧΡΗΣΤΗ ---
        const userRef = doc(db, "users_roles", editId);
        await setDoc(userRef, {
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          phone: formData.phone.trim(),
          place: formData.place.trim(),
          role: formData.role,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        alert(`Τα στοιχεία του χρήστη "${formData.firstname}" ενημερώθηκαν!`);
        navigate("/app/users");
      } else {
        // --- ΔΗΜΙΟΥΡΓΙΑ ΝΕΑΣ ΠΡΟΣΚΛΗΣΗΣ ---
        const token = generateUniqueToken();
        
        // Ορίζουμε τη λήξη σε 10 λεπτά
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 10);

        // Αποθήκευση στη νέα συλλογή 'invitations'
        const inviteRef = doc(db, "invitations", token);
        
        await setDoc(inviteRef, {
          email: normalizedEmail,
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          phone: formData.phone.trim(),
          place: formData.place.trim(),
          role: formData.role,
          expiresAt: expirationDate, 
          createdAt: serverTimestamp(),
        });

        // Δημιουργία του συνδέσμου
        const activationLink = `${window.location.origin}/activate-account?token=${token}`;
        setGeneratedLink(activationLink);

        // Καθαρισμός φόρμας για επόμενη χρήση
        setFormData({ email: "", firstname: "", lastname: "", phone: "", place: "", role: "delivery" });
      }
    } catch (err) {
      console.error("Error saving user:", err);
      setError(err instanceof Error ? err.message : "Σφάλμα κατά την αποθήκευση του χρήστη");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <BackButton label="Επιστροφή" className="mb-6" />

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isEditMode ? "Επεξεργασία χρήστη" : "Προσθήκη νέου συνεργάτη"}
            </h1>
            <p className="text-gray-600 text-sm">
              {isEditMode ? "Ενημερώστε τα στοιχεία" : "Συμπληρώστε τα στοιχεία για την αποστολή πρόσκλησης."}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Διεύθυνση Email"
              type="email"
              error={errors.email}
              disabled={isEditMode}
              readOnly={isEditMode}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                name="firstname"
                value={formData.firstname}
                onChange={handleInputChange}
                placeholder="Όνομα"
                error={errors.firstname}
              />
              <Input
                name="lastname"
                value={formData.lastname}
                onChange={handleInputChange}
                placeholder="Επώνυμο"
                error={errors.lastname}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Τηλέφωνο"
                type="tel"
                maxLength={10}
                error={errors.phone}
              />
              <Input
                name="place"
                value={formData.place}
                onChange={handleInputChange}
                placeholder="Περιοχή"
                error={errors.place}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label htmlFor="role" className="text-xs font-semibold text-gray-600 px-1">
                Ρόλος Χρήστη
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="office">Office</option>
                <option value="delivery">Delivery</option>
              </select>
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
                isEditMode ? 'Ενημέρωση Χρήστη' : 'Δημιουργία & Πρόσκληση'
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Ακύρωση
              </button>
            </div>
          </form>

          {/* ΕΜΦΑΝΙΣΗ TOY ΣΥΝΔΕΣΜΟΥ (Μόνο μετά από επιτυχή δημιουργία) */}
          {generatedLink && !isEditMode && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Η πρόσκληση δημιουργήθηκε!</h3>
              <p className="text-xs text-gray-600 mb-2">Αντιγράψτε τον παρακάτω σύνδεσμο και στείλτε τον. Ισχύει για 10 λεπτά.</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={generatedLink} 
                  className="w-full text-xs p-2 border border-gray-300 rounded bg-white text-gray-600 outline-none focus:ring-2 focus:ring-green-400"
                />
                <Button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    alert("Ο σύνδεσμος αντιγράφηκε!");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                >
                  Αντιγραφή
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewUser;
