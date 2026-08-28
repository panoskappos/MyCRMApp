import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Customer, Store } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { BackButton } from "../components/ui/BackButton";
import { Loader } from "../components/ui/Loader";
import {
  Building,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Package,
  History,
  Edit,
  ArrowLeft
} from "lucide-react";

export const CustomerStores: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManageExtinguishers = role && ['admin', 'developer'].includes(role);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId) {
        setError("Δεν βρέθηκε κωδικός πελάτη");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching customer with ID:", customerId);
        const { getCustomerById, getStoresByCustomerId } = await import('../services/customerService');

        const customerData = await getCustomerById(customerId);
        console.log("Customer data loaded:", customerData);

        if (!customerData) {
          setError("Δεν βρέθηκε ο πελάτης");
          setLoading(false);
          return;
        }

        setCustomer(customerData);

        // Load stores separately
        console.log("Fetching stores for customer:", customerId);
        const storesData = await getStoresByCustomerId(customerId);
        console.log("Stores loaded:", storesData);
        setStores(storesData);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        const errorMessage = err instanceof Error ? err.message : "Σφάλμα κατά τη φόρτωση των δεδομένων";
        console.error("Error details:", errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId]);

  if (loading) {
    return <Loader message="Φόρτωση πελάτη..." />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={() => navigate('/app/customers')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Πίσω
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || "Δεν βρέθηκε ο πελάτης"}</p>
              <Button onClick={() => navigate('/app/customers')} variant="outline">
                Επιστροφή στο Πελατολόγιο
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/app/customers" />
          <h1 className="text-2xl font-bold text-gray-900">
            Καταστήματα - {customer.name}
          </h1>
        </div>

        {/* New Store Button */}
        {canManageExtinguishers && (
          <div >
            <Button
              onClick={() => navigate(`/app/customers/${customerId}/stores/new`)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Νέο Κατάστημα
            </Button>
          </div>
        )}
      </div>

      {/* Customer Info Card */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg">Στοιχεία Πελάτη</CardTitle>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
            }`}>
            {customer.isActive ? 'Ενεργός' : 'Ανενεργός'}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">

            <div>
              <span className="font-medium text-gray-700">Κωδικός:</span>{" "}
              <span className="text-gray-600">{customer.customerID || 'Χωρίς κωδικό'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">ΑΦΜ:</span>{" "}
              <span className="text-gray-600">{customer.taxNumber || 'Χωρίς ΑΦΜ'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Τηλέφωνα:</span>{" "}
              <span className="text-gray-600">
                {[customer.mobile, customer.land_line].filter(Boolean).join(" / ") || 'Χωρίς τηλέφωνο'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>{" "}
              <span className="text-gray-600">{customer.email || 'Χωρίς email'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Πόλη:</span>{" "}
              <span className="text-gray-600">{customer.city || 'Χωρίς πόλη'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Διεύθυνση</span>{" "}
              <span className="text-gray-600">{customer.address || 'Χωρίς Διεύθυνση'}</span>
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 border-t border-red-500"></div>
            <div className="col-span-1 md:col-span-2 lg:col-span-2 pt-2">
              <span className="font-medium text-gray-700">Σχόλια</span>{" "}
              <span className="text-gray-600">{customer.comments || 'Χωρίς σχόλια'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stores List */}
      {stores.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                Δεν υπάρχουν καταστήματα
              </h3>
              <p className="text-gray-600 mb-4">
                Δεν έχουν καταχωρηθεί καταστήματα για αυτόν τον πελάτη.
              </p>
              <Button
                onClick={() => navigate(`/app/customers/${customerId}/stores/new`)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Προσθήκη Καταστήματος
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {stores.map((store) => (
            <StoreCard
              key={store.storeID}
              store={store}
              customerId={customerId!}
              onDelete={() => {
                // Refresh stores after delete
                setStores(stores.filter(s => s.storeID !== store.storeID));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface StoreCardProps {
  store: Store;
  customerId: string;
  onDelete: () => void;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, customerId, onDelete }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [extinguisherCount, setExtinguisherCount] = useState<number>(0);
  const [deleting, setDeleting] = useState(false);

  const canEdit = role && ['admin', 'office', 'developer'].includes(role);
  const canManageExtinguishers = role && ['admin', 'developer'].includes(role);

  useEffect(() => {
    const loadExtinguishers = async () => {
      try {
        const { getFireExtinguishersByStoreId } = await import('../services/customerService');
        const extinguishers = await getFireExtinguishersByStoreId(store.storeID);
        setExtinguisherCount(extinguishers.length);
      } catch (error) {
        console.error("Error loading extinguishers:", error);
      }
    };
    loadExtinguishers();
  }, [store.storeID]);

  const handleDelete = async () => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το κατάστημα "${store.storeName}"? Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`)) {
      return;
    }

    try {
      setDeleting(true);
      const { deleteStore } = await import('../services/customerService');

      await deleteStore(store.storeID, customerId);

      onDelete();
    } catch (error) {
      console.error("Error deleting store:", error);
      alert("Σφάλμα κατά τη διαγραφή του καταστήματος");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Store Name and ID */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {store.storeName || "Χωρίς όνομα"}
          </h3>
          <p className="text-sm text-gray-500">
            ID: {store.storeID}
          </p>
        </div>

        {/* Store Info */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          {(store.city || store.address) && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>{[store.city, store.address].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {store.mobile && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>{store.mobile}</span>
            </div>
          )}
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{extinguisherCount} πυροσβεστήρ{extinguisherCount !== 1 ? 'ες' : 'ας'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => navigate(`/app/customers/${customerId}/stores/${store.storeID}/extinguishers`)}
            className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center"
          >
            <Package className="h-4 w-4 mr-2" />
            Πυροσβεστήρες
          </button>
          <button
            onClick={() => navigate(`/app/customers/${customerId}/stores/${store.storeID}/history`)}
            className="px-3 py-2.5 bg-sky-50 hover:bg-sky-100 active:scale-[0.98] text-sky-900 border border-sky-200/80 text-sm font-medium rounded-xl transition-all flex items-center justify-center"
          >
            <History className="h-4 w-4 mr-2 text-sky-600" />
            Ιστορικό Ελέγχων
          </button>
          {canEdit && (
            <button
              onClick={() => navigate(`/app/customers/${customerId}/stores/new?id=${store.storeID}`)}
              className="col-span-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-blue-600 text-sm font-medium rounded-xl transition-colors flex items-center justify-center"
              title="Επεξεργασία καταστήματος"
            >
              <Edit className="h-4 w-4 mr-2 text-blue-600" />
              Επεξεργασία Καταστήματος
            </button>
          )}
          {canManageExtinguishers && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="col-span-2 px-3 py-2 border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
              title="Διαγραφή καταστήματος"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Διαγραφή Καταστήματος
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerStores;
