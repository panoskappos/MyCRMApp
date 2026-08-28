import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckSquare, Square, Plus, Flame, Trash2, Edit } from "lucide-react";
import { Loader } from "../components/ui/Loader";
import { Button } from "../components/ui/Button";
import { BackButton } from "../components/ui/BackButton";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { QrFireExtinguishers } from "../components/QrFireExtinguishers";
import type { Customer, Store, FireExtinguisher } from "../types";

export const FireExtinguishersList: React.FC = () => {
  const { customerId, storeId } = useParams<{ customerId: string; storeId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [extinguishers, setExtinguishers] = useState<FireExtinguisher[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingExtinguisher, setEditingExtinguisher] = useState<FireExtinguisher | null>(null);
  const [deletingExtinguisher, setDeletingExtinguisher] = useState<FireExtinguisher | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const canManageExtinguishers = role && ['admin', 'developer'].includes(role);

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !storeId) return;

      try {
        const { getCustomerById, getStoreById, getFireExtinguishersWithInspectionsByStoreId } = await import('../services/customerService');

        const [customerData, storeData, extinguishersData] = await Promise.all([
          getCustomerById(customerId),
          getStoreById(storeId),
          getFireExtinguishersWithInspectionsByStoreId(storeId)
        ]);

        //For the "new" automatic A/A system
        extinguishersData.sort((a, b) =>
          a.extinguisherID.localeCompare(b.extinguisherID));

        if (!customerData || !storeData) {
          console.error("Customer or store not found!");
          setLoading(false);
          return;
        }

        setCustomer(customerData);
        setStore(storeData);
        setExtinguishers(extinguishersData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, storeId]);

  const handleSelectAll = () => {
    if (selectedIds.size === extinguishers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extinguishers.map(ext => ext.extinguisherID)));
    }
  };

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSortByYear = () => {
    const sorted = [...extinguishers].sort((a, b) => {
      const yearA = parseInt(a.manufacturingYear || '0');
      const yearB = parseInt(b.manufacturingYear || '0');
      return sortOrder === 'asc' ? yearA - yearB : yearB - yearA;
    });
    setExtinguishers(sorted);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getLastInspectionDate = (ext: FireExtinguisher): string => {
    if (!ext.inspections || Object.keys(ext.inspections).length === 0) {
      return '-';
    }
    // Filter only active inspections
    const activeDates = Object.keys(ext.inspections)
      .filter(date => {
        const inspection = ext.inspections[date];
        return inspection.isActive !== false; // Include if undefined or true
      })
      .sort((a, b) => b.localeCompare(a));

    if (activeDates.length === 0) {
      return '-';
    }

    const lastDate = activeDates[0];
    const date = new Date(lastDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getNextInspectionDate = (ext: FireExtinguisher): string => {
    if (!ext.inspections || Object.keys(ext.inspections).length === 0) {
      return '-';
    }
    // Filter only active inspections
    const activeDates = Object.keys(ext.inspections)
      .filter(date => {
        const inspection = ext.inspections[date];
        return inspection.isActive !== false; // Include if undefined or true
      })
      .sort((a, b) => b.localeCompare(a));

    if (activeDates.length === 0) {
      return '-';
    }

    const lastInspection = ext.inspections[activeDates[0]];
    if (!lastInspection.recheckDate) {
      return '-';
    }
    const date = new Date(lastInspection.recheckDate);
    return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleEdit = (ext: FireExtinguisher) => {
    setEditingExtinguisher({ ...ext });
    setIsEditModalOpen(true);
  };

  const handleDelete = (ext: FireExtinguisher) => {
    setDeletingExtinguisher(ext);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingExtinguisher) return;

    setIsSaving(true);
    try {
      const { updateFireExtinguisher } = await import('../services/customerService');
      await updateFireExtinguisher(editingExtinguisher.extinguisherID, {
        type: editingExtinguisher.type,
        manufacturer: editingExtinguisher.manufacturer,
        manufacturingYear: editingExtinguisher.manufacturingYear,
        shellNumber: editingExtinguisher.shellNumber,
        serialNumber: editingExtinguisher.serialNumber,
        aaNumber: editingExtinguisher.aaNumber,
        sold: editingExtinguisher.sold,
      });

      // Update local state
      setExtinguishers(extinguishers.map(ext =>
        ext.extinguisherID === editingExtinguisher.extinguisherID ? editingExtinguisher : ext
      ));

      setIsEditModalOpen(false);
      setEditingExtinguisher(null);
    } catch (error) {
      console.error('Error updating fire extinguisher:', error);
      alert('Σφάλμα κατά την ενημέρωση του πυροσβεστήρα');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExtinguisher) return;

    setIsSaving(true);
    try {
      const { deleteFireExtinguisher } = await import('../services/customerService');
      await deleteFireExtinguisher(deletingExtinguisher.extinguisherID);

      // Update local state
      setExtinguishers(extinguishers.filter(ext => ext.extinguisherID !== deletingExtinguisher.extinguisherID));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingExtinguisher.extinguisherID);
        return newSet;
      });

      setIsDeleteModalOpen(false);
      setDeletingExtinguisher(null);
    } catch (error) {
      console.error('Error deleting fire extinguisher:', error);
      alert('Σφάλμα κατά τη διαγραφή του πυροσβεστήρα');
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique next inspection dates
  const nextInspectionDates = Array.from(new Set(
    extinguishers.map(ext => getNextInspectionDate(ext))
      .filter(date => date !== '-')
  )).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
  });

  const handleSelectByDate = (date: string) => {
    if (!date) return;
    const idsToSelect = extinguishers
      .filter(ext => getNextInspectionDate(ext) === date)
      .map(ext => ext.extinguisherID);

    setSelectedIds(new Set(idsToSelect));
  };

  if (loading) {
    return <Loader message="Φόρτωση πυροσβεστήρων..." />;
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
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton to={`/app/customers/${customerId}/stores`} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Πυροσβεστήρες - {store.storeName}
          </h1>
          <p className="text-sm text-gray-600">
            Πελάτης: {customer.name} | Κωδ. Καταστήματος: {store.storeID}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {canManageExtinguishers && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between container-actionbutton">
            <div className="flex gap-2 container-actionbutton">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                className="flex items-center gap-2"
              >
                {selectedIds.size === extinguishers.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedIds.size === extinguishers.length ? 'Αποεπιλογή Όλων' : 'Επιλογή Όλων'}
              </Button>

              {nextInspectionDates.length > 0 && (
                <div className="relative">
                  <select
                    className="h-10 pl-10 pr-8 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 cursor-pointer appearance-none hover:bg-gray-50 transition-colors"
                    onChange={(e) => {
                      handleSelectByDate(e.target.value);
                      e.target.value = ""; // Reset selection
                    }}
                    defaultValue=""
                    style={{ minWidth: '240px' }}
                  >
                    <option value="" disabled>Επιλογή ανά ημερομηνία ελέγχου</option>
                    {nextInspectionDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/app/customers/${customerId}/stores/${storeId}/extinguishers/new`)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Νέος Πυροσβεστήρας
              </Button>

              <Button
                onClick={() => {
                  if (selectedIds.size === 0) {
                    alert("Παρακαλώ επιλέξτε τουλάχιστον έναν πυροσβεστήρα");
                    return;
                  }
                  const idsParam = Array.from(selectedIds).join(',');
                  const selectedExtinguishers = extinguishers.filter(ext => selectedIds.has(ext.extinguisherID));
                  navigate(`/app/customers/${customerId}/stores/${storeId}/inspections/new?extinguishers=${idsParam}`, {
                    state: { selectedExtinguishers }
                  });
                }}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Νέος Έλεγχος
              </Button>
            </div>

          </div>
        </div>
      )}
      {/* Extinguishers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {extinguishers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Δεν βρέθηκαν πυροσβεστήρες για αυτό το κατάστημα
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    {/* Fire extinguisher icon */}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S/N
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Τύπος
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Κατασκευαστής
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={handleSortByYear}
                  >
                    Έτος {sortOrder === 'asc' ? '↑' : '↓'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Αρ. Κελύφους
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Τελευταίος Έλεγχος
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Επόμενος Έλεγχος
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  {canManageExtinguishers && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ενέργειες
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {extinguishers.map((ext) => (
                  <tr
                    key={ext.extinguisherID}
                    className={`hover:bg-slate-50 transition-colors ${selectedIds.has(ext.extinguisherID) ? 'bg-sky-50/70' : ''
                      }`}
                  >
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Flame className="h-4 w-4 text-gray-900 mx-auto" strokeWidth={2} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ext.extinguisherID)}
                        onChange={() => handleToggle(ext.extinguisherID)}
                        className="h-4 w-4 text-slate-600 focus:ring-slate-400 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                      {ext.extinguisherID}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {ext.type || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {ext.manufacturer || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {ext.manufacturingYear || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {ext.shellNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {getLastInspectionDate(ext)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {getNextInspectionDate(ext)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <QrFireExtinguishers
                        extinguisher={ext}
                        customerName={customer.name || undefined}
                        storeName={store.storeName || undefined}
                      />
                    </td>
                    {canManageExtinguishers && (
                      <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(ext)}
                            className="p-1 hover:bg-blue-100 rounded"
                            title="Επεξεργασία"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(ext)}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Διαγραφή"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600 text-center">
        Σύνολο: {extinguishers.length} πυροσβεστήρ{extinguishers.length !== 1 ? 'ες' : 'ας'}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExtinguisher(null);
        }}
        title="Επεξεργασία Πυροσβεστήρα"
      >
        {editingExtinguisher && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S/N (Σειριακός Αριθμός)
              </label>
              <Input
                value={editingExtinguisher.serialNumber || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, serialNumber: e.target.value })}
                placeholder="Σειριακός Αριθμός"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Τύπος
              </label>
              <Input
                value={editingExtinguisher.type || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, type: e.target.value })}
                placeholder="Τύπος πυροσβεστήρα"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Κατασκευαστής
              </label>
              <Input
                value={editingExtinguisher.manufacturer || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, manufacturer: e.target.value })}
                placeholder="Κατασκευαστής"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Έτος Κατασκευής
              </label>
              <Input
                value={editingExtinguisher.manufacturingYear || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, manufacturingYear: e.target.value })}
                placeholder="Έτος"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αριθμός Κελύφους
              </label>
              <Input
                value={editingExtinguisher.shellNumber || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, shellNumber: e.target.value })}
                placeholder="Αριθμός Κελύφους"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Α/Α Αριθμός
              </label>
              <Input
                type="number"
                value={editingExtinguisher.aaNumber?.toString() || ''}
                onChange={(e) => setEditingExtinguisher({ ...editingExtinguisher, aaNumber: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Α/Α Αριθμός"
              />
            </div> */}

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingExtinguisher(null);
                }}
                disabled={isSaving}
              >
                Ακύρωση
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingExtinguisher(null);
        }}
        title="Επιβεβαίωση Διαγραφής"
      >
        {deletingExtinguisher && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον πυροσβεστήρα με S/N <strong>{deletingExtinguisher.extinguisherID}</strong>?
            </p>
            <p className="text-sm text-red-600">
              ⚠️ Αυτή η ενέργεια θα διαγράψει επίσης όλους τους ελέγχους που σχετίζονται με αυτόν τον πυροσβεστήρα και δεν μπορεί να αναιρεθεί!
            </p>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingExtinguisher(null);
                }}
                disabled={isSaving}
              >
                Ακύρωση
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSaving ? 'Διαγραφή...' : 'Διαγραφή'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FireExtinguishersList;
