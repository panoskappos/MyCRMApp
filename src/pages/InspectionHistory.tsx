import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, FileText, Trash2 } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Loader } from "../components/ui/Loader";
import { Button } from "../components/ui/Button";
import { BackButton } from "../components/ui/BackButton";
import { useAuth } from "../context/AuthContext";
import type { Customer, Store } from "../types";

interface InspectionGroup {
  date: string;
  isActive: boolean;
  extinguishers: Array<{
    extinguisherID: string;
    type: string;
    maintenanceType: string;
  }>;
}

export const InspectionHistory: React.FC = () => {
  const { customerId, storeId } = useParams<{ customerId: string; storeId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [inspectionGroups, setInspectionGroups] = useState<InspectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const canEdit = role && ['admin', 'office', 'developer'].includes(role);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !storeId) return;

      try {
        const { getCustomerById, getStoreById, getFireExtinguishersWithInspectionsByStoreId } = await import('../services/customerService');

        const [customerData, storeData, extinguishersData] = await Promise.all([
          getCustomerById(customerId),
          getStoreById(storeId),
          getFireExtinguishersWithInspectionsByStoreId(storeId, true) // Include inactive inspections
        ]);

        if (!customerData || !storeData) {
          console.error("Customer or store not found!");
          setLoading(false);
          return;
        }

        setCustomer(customerData);
        setStore(storeData);

        // Group inspections by date
        const groupedMap = new Map<string, InspectionGroup>();

        extinguishersData.forEach((ext) => {
          if (ext.inspections) {
            Object.keys(ext.inspections).forEach((date) => {
              const inspection = ext.inspections[date];
              const isActive = inspection.isActive !== undefined ? inspection.isActive : true;

              if (!groupedMap.has(date)) {
                groupedMap.set(date, {
                  date,
                  isActive,
                  extinguishers: []
                });
              }

              groupedMap.get(date)!.extinguishers.push({
                extinguisherID: ext.extinguisherID,
                type: ext.type || 'N/A',
                maintenanceType: inspection.maintenanceType || 'N/A'
              });
            });
          }
        });

        // Convert to array and sort by date (newest first)
        const grouped = Array.from(groupedMap.values()).sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setInspectionGroups(grouped);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, storeId]);

  const handleViewMitro = (date: string, extinguisherIds: string[]) => {
    const idsParam = extinguisherIds.join(',');
    navigate(`/app/customers/${customerId}/stores/${storeId}?selected=${idsParam}&date=${date}`);
  };

  const handleToggleStatus = async (date: string, extinguisherIds: string[], currentStatus: boolean) => {
    setToggling(date);
    try {
      const { updateInspectionStatus } = await import('../services/customerService');
      const newStatus = !currentStatus;

      // Update status for each extinguisher
      const updatePromises = extinguisherIds.map(async (extId) => {
        await updateInspectionStatus(extId, date, newStatus);
      });

      await Promise.all(updatePromises);

      // Update local state
      setInspectionGroups(prev =>
        prev.map(group =>
          group.date === date ? { ...group, isActive: newStatus } : group
        )
      );

    } catch (err) {
      console.error("Error toggling inspection status:", err);
      alert("Αποτυχία ενημέρωσης κατάστασης ελέγχου. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteInspection = async (date: string, extinguisherIds: string[]) => {
    const confirmDelete = window.confirm(
      `Είστε σίγουροι ότι θέλετε να διαγράψετε τον έλεγχο της ${formatDate(date)}?\n\nΘα διαγραφούν οι έλεγχοι για ${extinguisherIds.length} πυροσβεστήρες.`
    );

    if (!confirmDelete) return;

    try {
      // Delete inspection for each extinguisher
      const deletePromises = extinguisherIds.map(async (extId) => {
        const inspectionRef = doc(db, `fire_extinguishers/${extId}/inspections`, date);
        await deleteDoc(inspectionRef);
      });

      await Promise.all(deletePromises);

      // Remove the deleted group from state
      setInspectionGroups(prev => prev.filter(group => group.date !== date));

      alert(`Ο έλεγχος της ${formatDate(date)} διαγράφηκε επιτυχώς!`);
    } catch (err) {
      console.error("Error deleting inspection:", err);
      alert("Αποτυχία διαγραφής ελέγχου. Παρακαλώ δοκιμάστε ξανά.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <Loader message="Φόρτωση ιστορικού ελέγχων..." />;
  }

  if (!customer || !store) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-red-600">Δεν βρέθηκαν τα δεδομένα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton to={`/app/customers/${customerId}/stores`} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ιστορικό Ελέγχων - {store.storeName}
          </h1>
          <p className="text-sm text-gray-600">
            Πελάτης: {customer.name} | Κωδ. Καταστήματος: {store.storeID}
          </p>
        </div>
      </div>

      {/* Inspections List */}
      <div className="space-y-4">
        {inspectionGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Δεν βρέθηκαν έλεγχοι για αυτό το κατάστημα</p>
          </div>
        ) : (
          inspectionGroups.map((group) => (
            <div
              key={group.date}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className={`border-b px-6 py-4 ${group.isActive
                ? 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200'
                : 'bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300'
                }`}>
                <div className="sm: flex flex-col gap-4 md:flex-row lg:flex-row flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Calendar className={`h-5 w-5 ${group.isActive ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-bold ${group.isActive ? 'text-slate-900' : 'text-slate-500'
                          }`}>
                          {formatDate(group.date)}
                        </h3>
                        {!group.isActive && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-slate-300 text-slate-700">
                            Ανενεργός
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${group.isActive ? 'text-slate-600' : 'text-slate-500'
                        }`}>
                        {group.extinguishers.length} πυροσβεστήρ{group.extinguishers.length !== 1 ? 'ες' : 'ας'}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleToggleStatus(group.date, group.extinguishers.map(e => e.extinguisherID), group.isActive)}
                        disabled={toggling === group.date}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${toggling === group.date ? 'opacity-50 cursor-not-allowed' : ''
                          } ${group.isActive ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        title={group.isActive ? 'Απενεργοποίηση ελέγχου' : 'Ενεργοποίηση ελέγχου'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${group.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleViewMitro(group.date, group.extinguishers.map(e => e.extinguisherID))}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Έλεγχος
                    </Button>
                    {canEdit && (
                      <Button
                        onClick={() => handleDeleteInspection(group.date, group.extinguishers.map(e => e.extinguisherID))}
                        className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Διαγραφή
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Extinguishers List */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.extinguishers.map((ext) => (
                    <div
                      key={ext.extinguisherID}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-bold text-sm">
                          {ext.extinguisherID.slice(-3)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          S/N: {ext.extinguisherID}
                        </p>
                        <p className="text-xs text-gray-600">
                          {ext.type}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${ext.maintenanceType === 'ΕΤΗΣΙΑ' ? 'bg-green-100 text-green-800' :
                          ext.maintenanceType === '5-ΕΤΗΣ' ? 'bg-blue-100 text-blue-800' :
                            ext.maintenanceType === '10-ΕΤΗΣ' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {ext.maintenanceType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {inspectionGroups.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Σύνολο: {inspectionGroups.length} ημερομηνί{inspectionGroups.length !== 1 ? 'ες' : 'α'} ελέγχου
        </div>
      )}
    </div>
  );
};

export default InspectionHistory;
