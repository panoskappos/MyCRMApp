import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import type { Role, User } from "../types";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  role: Role | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  loading: true,
  logout: async () => {
    console.warn("Logout function not implemented");
  },
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users_roles", auth.currentUser.uid);
          await updateDoc(userRef, {
            isOnline: false,
            lastLogin: serverTimestamp()
          });
        } catch (e) {
          // Ignore error updating status if document doesn't exist yet
        }
      }
      await signOut(auth);
    } catch (err) {
      console.error("Σφάλμα κατά το logout:", err);
    } finally {
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          console.log("🔍 Auth UID:", firebaseUser.uid);
          console.log("🔍 Looking up collection: users_roles, doc:", firebaseUser.uid);
          const userRef = doc(db, "users_roles", firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          console.log("🔍 Document exists?", userDoc.exists());
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            console.log("🔍 User data:", JSON.stringify(userData));
            console.log("🔍 Role found:", userData.role);
            setUserProfile(userData);
            setRole(userData.role as Role);

            // Update online status if not already online
            if (!userData.isOnline) {
              try {
                await updateDoc(userRef, {
                  isOnline: true,
                  lastLogin: serverTimestamp()
                });
              } catch (e) {
                console.warn("Could not update online status:", e);
              }
            }
          } else {
            console.warn("User profile document not found in 'users_roles' for UID:", firebaseUser.uid);
            setUserProfile(null);
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user profile from users_roles:", error);
          setUserProfile(null);
          setRole(null);
        }
      } else {
        setUserProfile(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
