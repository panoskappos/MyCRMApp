import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";
import { Input } from "../components/ui/Input";
// Εισαγωγή των εικονιδίων Eye και EyeOff από το lucide-react
import { Eye, EyeOff } from "lucide-react"; 

export const ActivateAccount: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Παίρνουμε το token από το URL

  const [loading, setLoading] = useState(true); // Αρχίζει ως true για να κάνει τον έλεγχο
  const [error, setError] = useState<string | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  // Προσθήκη καταστάσεων για την εμφάνιση/απόκρυψη των κωδικών
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- Αυτόματος Έλεγχος του Token κατά το φόρτωμα ---
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Δεν βρέθηκε αναγνωριστικό πρόσκλησης (token) στον σύνδεσμο.");
        setLoading(false);
        return;
      }

      try {
        const inviteRef = doc(db, "invitations", token);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setError("Ο σύνδεσμος δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί.");
          setLoading(false);
          return;
        }

        const inviteData = inviteSnap.data();

        // Έλεγχος λήξης του Token
        const now = new Date();
        const expirationDate = inviteData.expiresAt?.toDate();

        if (expirationDate && now > expirationDate) {
          setError("Αυτός ο σύνδεσμος πρόσκλησης έχει λήξει. Επικοινωνήστε με τον διαχειριστή.");
          setLoading(false);
          return;
        }

        // Το token είναι έγκυρο! Κρατάμε τα δεδομένα.
        setPendingUserData(inviteData);
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("Παρουσιάστηκε σφάλμα κατά τον έλεγχο του συνδέσμου.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // --- Ολοκλήρωση Εγγραφής ---
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Ο κωδικός πρόσβασης πρέπει να είναι τουλάχιστον 6 χαρακτήρες.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Οι κωδικοί πρόσβασης δεν ταιριάζουν.");
      return;
    }

    try {
      setLoading(true);
      
      // 1. Δημιουργία χρήστη στο Auth
      const userCredential = await createUserWithEmailAndPassword(auth, pendingUserData.email, password);
      const newUser = userCredential.user;

      // 2. Δημιουργία ΝΕΟΥ εγγράφου στον ΠΡΑΓΜΑΤΙΚΟ πίνακα χρηστών (users_roles)
      const newUserRef = doc(db, "users_roles", newUser.uid);
      const { expiresAt, ...dataToKeep } = pendingUserData; // Πετάμε την ημερομηνία λήξης, κρατάμε τα υπόλοιπα

      await setDoc(newUserRef, {
        ...dataToKeep,
        isActive: true, // Πλέον είναι επίσημα ενεργός
        isOnline: true,    // Μόλις συνδέθηκε
        updatedAt: serverTimestamp(),
      });

      // 3. Διαγραφή της ΠΡΟΣΚΛΗΣΗΣ από την προσωρινή συλλογή
      if (token) {
        const oldInviteRef = doc(db, "invitations", token);
        await deleteDoc(oldInviteRef);
      }

      // Hard redirect στην εφαρμογή
      window.location.href = "/app/home"; 
    } catch (err: any) {
      console.error("Error activating account:", err);
      setError(err.message || "Σφάλμα κατά την ενεργοποίηση του λογαριασμού.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ενεργοποίηση Λογαριασμού
          </h1>
          {pendingUserData && (
            <p className="text-gray-600 text-sm">
              Καλώς ορίσατε {pendingUserData.firstname}! Ορίστε τον κωδικό πρόσβασής σας.
            </p>
          )}
        </div>

        {loading && !pendingUserData && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="loading-spinner mb-4"></div>
            <p className="text-gray-500 text-sm">Γίνεται επαλήθευση του συνδέσμου...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Φόρμα Ορισμού Κωδικού (εμφανίζεται μόνο αν ο έλεγχος πέτυχε) */}
        {!loading && pendingUserData && (
          <form onSubmit={handleActivateAccount} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <span className="text-xs text-gray-500 block">Email Λογαριασμού</span>
              <span className="text-sm font-semibold text-gray-700">{pendingUserData.email}</span>
            </div>

            {/* Wrapper για το πρώτο πεδίο κωδικού */}
            <div className="relative">
              <Input
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Νέος Κωδικός (τουλ. 6 χαρακτήρες)"
                type={showPassword ? "text" : "password"} // Δυναμικός τύπος
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Wrapper για το δεύτερο πεδίο κωδικού */}
            <div className="relative">
              <Input
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Επιβεβαίωση Κωδικού"
                type={showConfirmPassword ? "text" : "password"} // Δυναμικός τύπος
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3 text-base rounded-xl shadow-sm shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="loading-spinner mr-2"></div>
                  Ενεργοποίηση...
                </>
              ) : (
                "Ολοκλήρωση Εγγραφής"
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ActivateAccount;
