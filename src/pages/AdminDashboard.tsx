import React, { useEffect, useState, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Users, UserPlus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { getTotalCustomersCount, getTotalFireExtinguishersCount, syncAllCustomerStoreCounts } from "../services/customerService";
import { Button } from "../components/ui/Button";
import { AuthContext } from "../context/AuthContext";
import { Role } from "../types";
// ΝΕΟ: Εισαγωγή του Loader component
import { Loader } from "../components/ui/Loader";

export const AdminDashboard: React.FC = () => {
  const adminActions = [
    {
      title: "Διαχείριση Χρηστών",
      description: "Προβολή και διαχείριση χρηστών",
      icon: Users,
      href: "/app/admin/users",
      color: "var(--info)",
    },
    {
      title: "Προσθήκη Χρήστη",
      description: "Δημιουργία νέου λογαριασμού χρήστη",
      icon: UserPlus,
      href: "/app/admin/users/new",
      color: "var(--success)",
    },
  ];

  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [fireExtinguisherCount, setFireExtinguisherCount] = useState<number | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  
  // ΝΕΟ: Ξεχωριστό state για την κατάσταση του συγχρονισμού
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const context = useContext(AuthContext);

  async function handleSyncAllCustomerStoreCounts() {
    try {
      setIsSyncing(true); // Ενεργοποιούμε το loading ΜΟΝΟ για το κουμπί
      await syncAllCustomerStoreCounts();
      alert("Ο συγχρονισμός ολοκληρώθηκε επιτυχώς!"); // Καλό είναι να ενημερώνουμε τον χρήστη
    }
    catch (error) {
      console.error("❌ Error syncing customer store counts:", error);
      alert("Υπήρξε ένα σφάλμα κατά τον συγχρονισμό.");
    }
    finally {
      setIsSyncing(false); // Επαναφέρουμε το κουμπί
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadCounts = async () => {
      try {
        const [customers, extinguishers] = await Promise.all([
          getTotalCustomersCount(),
          getTotalFireExtinguishersCount()
        ]);
        if (!isMounted) {
          return;
        }
        setCustomerCount(customers);
        setFireExtinguisherCount(extinguishers);
      } catch (error) {
        console.error("❌ Error loading system counts:", error);
        if (!isMounted) {
          return;
        }
        setCustomerCount(null);
        setFireExtinguisherCount(null);
      } finally {
        if (isMounted) {
          setIsLoadingCounts(false);
        }
      }
    };

    loadCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Διαχείριση Συστήματος</h1>
      </div>
      
      {context?.role === Role.Developer && (
        <div>
          <Button 
            onClick={handleSyncAllCustomerStoreCounts} 
            disabled={isSyncing} // Κλειδώνει το κουμπί όταν φορτώνει
            className="flex items-center space-x-2 disabled:opacity-70"
          >
            {isSyncing ? (
              <Loader className="h-4 w-4 mr-2" /> // Εμφάνιση του Spinner
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" /> // Κανονικό εικονίδιο
            )}
            <p className="text-sm">
              {isSyncing ? "Συγχρονισμός σε εξέλιξη..." : "Συγχρονισμός Πελατών με καταστήματα"}
            </p>
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {adminActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full" style={{ borderColor: 'var(--border)' }}>
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-md text-white flex-shrink-0" style={{ backgroundColor: action.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base sm:text-lg" style={{ color: 'var(--primary-gray)' }}>{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" style={{ color: 'var(--light-gray)' }}>{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>Πληροφορίες Συστήματος</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {isLoadingCounts ? "…" : customerCount ?? "—"}
              </div>
              <div className="text-sm text-gray-600">Πελάτες</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {isLoadingCounts ? "…" : fireExtinguisherCount ?? "—"}
              </div>
              <div className="text-sm text-gray-600">Πυροσβεστήρες</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
