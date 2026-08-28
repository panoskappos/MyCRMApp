import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Loader } from "../components/ui/Loader";
import { Logo } from "../components/ui/Logo";
import { LogIn, AlertCircle, Eye, EyeOff } from "lucide-react"; 

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Κατάσταση για την εμφάνιση/απόκρυψη του κωδικού
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  if (authLoading) {
    return <Loader message="Έλεγχος σύνδεσης..." />;
  }

  if (user && role) {
    return <Navigate to="/app/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login error:", err);
      setError("Λανθασμένα διαπιστευτήρια. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Συνδεθείτε για πρόσβαση στο σύστημα
          </p>
        </div>

        {/* Login Form */}
        <div className="p-8 rounded-2xl shadow-xl bg-white border border-slate-200/80">
          <h3 className="text-xl font-bold mb-6 text-center text-slate-900 tracking-tight">
            Σύνδεση
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                Κωδικός Πρόσβασης
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Εισάγετε τον κωδικό σας"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-xl text-red-700 bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center disabled:opacity-50 mt-6 text-sm"
            >
              {loading ? (
                <>
                  <div className="loading-spinner mr-2"></div>
                  Σύνδεση...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Σύνδεση
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
