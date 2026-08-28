import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Προστέθηκε το deleteDoc
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/ui/Loader';
import { Button } from '../components/ui/Button';
import { ShieldCheck } from 'lucide-react';

// Ορίζουμε τη δομή των δεδομένων του χρήστη
interface UserRole {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  place: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  isDeleted?: boolean;
}

export const Users: React.FC = () => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const navigate = useNavigate();

  // Συνάρτηση για την ανάκτηση ΟΛΩΝ των χρηστών από το Firestore
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCol = collection(db, 'users_roles');
      const userSnapshot = await getDocs(usersCol);
      
      const usersList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRole[];

      // Κρατάμε πλέον ΚΑΙ τους διαγραμμένους στο τοπικό state
      setUsers(usersList);
      setError(null);
    } catch (err) {
      console.error("Σφάλμα κατά την ανάκτηση χρηστών:", err);
      setError("Δεν ήταν δυνατή η φόρτωση των χρηστών.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Soft Delete: Μαρκάρει τον χρήστη ως διαγραμμένο
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Είστε σίγουροι ότι θέλετε να μεταφέρετε τον χρήστη ${userName} στους διαγραμμένους;`)) {
      try {
        const userRef = doc(db, 'users_roles', userId);
        await updateDoc(userRef, { isDeleted: true });
        
        // Ενημέρωση του τοπικού state χωρίς να κάνουμε ξανά fetch
        setUsers(users.map(u => u.id === userId ? { ...u, isDeleted: true } : u));
        alert(`Ο χρήστης ${userName} μεταφέρθηκε στους διαγραμμένους.`);
      } catch (err) {
        console.error("Σφάλμα διαγραφής:", err);
        alert("Υπήρξε πρόβλημα κατά τη διαγραφή του χρήστη.");
      }
    }
  };

  // 2. Επαναφορά (Restore): Αφαιρεί το isDeleted
  const handleRestoreUser = async (userId: string, userName: string) => {
    if (window.confirm(`Θέλετε να επαναφέρετε τον χρήστη ${userName} στις ενεργές προσκλήσεις/χρήστες;`)) {
      try {
        const userRef = doc(db, 'users_roles', userId);
        await updateDoc(userRef, { isDeleted: false });
        
        setUsers(users.map(u => u.id === userId ? { ...u, isDeleted: false } : u));
        alert(`Ο χρήστης ${userName} επαναφέρθηκε επιτυχώς.`);
      } catch (err) {
        console.error("Σφάλμα επαναφοράς:", err);
        alert("Υπήρξε πρόβλημα κατά την επαναφορά του χρήστη.");
      }
    }
  };

  // 3. Οριστική Διαγραφή (Hard Delete): Αφαιρεί οριστικά το έγγραφο από το Firestore
  const handleHardDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`ΠΡΟΣΟΧΗ: Θέλετε να διαγράψετε ΟΡΙΣΤΙΚΑ τον χρήστη ${userName}; Αυτή η ενέργεια δεν αναιρείται!`)) {
      try {
        await deleteDoc(doc(db, 'users_roles', userId));
        
        // Αφαίρεση του χρήστη από τον πίνακα του state
        setUsers(users.filter(u => u.id !== userId));
        alert(`Ο χρήστης ${userName} διαγράφηκε οριστικά.`);
      } catch (err) {
        console.error("Σφάλμα οριστικής διαγραφής:", err);
        alert("Υπήρξε πρόβλημα κατά την οριστική διαγραφή του χρήστη.");
      }
    }
  };

  // Υπολογισμός των φιλτραρισμένων και ταξινομημένων χρηστών
  const filteredAndSortedUsers = useMemo(() => {
    let result = users;

    if (filterRole === 'deleted') {
      // Αν επιλέξουμε το φίλτρο "Διαγραμμένοι", δείχνουμε ΜΟΝΟ αυτούς
      result = users.filter(user => user.isDeleted === true);
    } else {
      // Σε όλα τα άλλα φίλτρα, αποκλείουμε τους διαγραμμένους
      result = users.filter(user => user.isDeleted !== true);
      
      // Επιπλέον φιλτράρισμα βάσει ρόλου (αν δεν είναι 'all')
      if (filterRole !== 'all') {
        result = result.filter(user => user.role === filterRole);
      }
    }

    const roleOrder: Record<string, number> = {
      admin: 1,
      office: 2,
      delivery: 3,
      developer: 4
    };

    return [...result].sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      return orderA - orderB;
    });
  }, [users, filterRole]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 text-slate-800" />
      </div>
    );
  }

  // Οι διαθέσιμες επιλογές για τα φίλτρα προστέθηκε ο 'Διαγραμμένοι'
  const filterOptions = [
    { id: 'all', label: 'Όλοι' },
    { id: 'admin', label: 'Admin' },
    { id: 'office', label: 'Office' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'developer', label: 'Developer' },
    { id: 'deleted', label: 'Διαγραμμένοι' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Διαχείριση Χρηστών</h1>
          <p className="text-sm text-gray-500">Προβολή και διαχείριση συνεργατών και δικαιωμάτων.</p>
        </div>
        <Button 
          onClick={() => navigate('/app/admin/users/new')}
          className="bg-slate-800 hover:bg-slate-900 text-white w-full sm:w-auto"
        >
          + Νέος Χρήστης
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Φίλτρα: Χάπια (Pill Buttons) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map(option => (
          <button
            key={option.id}
            onClick={() => setFilterRole(option.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterRole === option.id
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : option.id === 'deleted' 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' // Ειδικό στυλ για το "Διαγραμμένοι"
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredAndSortedUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 border border-gray-100">
          Δεν βρέθηκαν χρήστες με αυτό το φίλτρο.
        </div>
      ) : (
        <>
          {/* ΜΟΡΦΗ 1: Κάρτες για κινητά (κρυφό σε οθόνες md και πάνω) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredAndSortedUsers.map((user) => (
              <div key={user.id} className={`bg-white rounded-lg shadow-sm border p-4 flex flex-col space-y-3 ${user.isDeleted ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                {/* Κεφαλίδα Κάρτας: Όνομα-Link και Ρόλος */}
                <div className="flex justify-between items-start">
                  <div>
                    {/* ΝΕΟ: Το όνομα είναι πλέον κουμπί για πλοήγηση στο προφίλ */}
                    <button 
                      onClick={() => navigate(`/app/admin/users/new?id=${user.id}`)}
                      className="text-base font-semibold text-indigo-600 hover:text-indigo-800 text-left transition-colors"
                    >
                      {user.firstname} {user.lastname}
                    </button>
                    <p className="text-sm text-gray-500">{user.place || '-'}</p>
                  </div>
                  <span className="px-2 py-1 inline-flex text-[10px] leading-4 font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>

                {/* Πληροφορίες Επικοινωνίας */}
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-gray-500 mt-0.5">{user.phone || '-'}</div>
                </div>

                {/* Κατάσταση & Online/Offline */}
                <div className="flex items-center space-x-3 pt-2">
                  {user.isDeleted ? (
                    <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Διεγραμμένος
                    </span>
                  ) : user.isActive ? (
                    <div className="flex items-center text-green-600" title="Ενεργοποιημένος Λογαριασμός">
                      <ShieldCheck className="h-5 w-5 mr-1" />
                      <span className="text-xs font-medium">Ενεργός</span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Εκκρεμεί
                    </span>
                  )}
                  
                  {!user.isDeleted && user.isActive && user.role !== 'developer' && (
                    <span className={`text-xs font-medium border-l border-gray-200 pl-3 ${user.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                      {user.isOnline ? '● Online' : '○ Offline'}
                    </span>
                  )}
                </div>

                {/* Ενέργειες (Διαγραμμένοι vs Ενεργοί) */}
                <div className="flex justify-end space-x-4 pt-3 border-t border-gray-100 mt-2">
                  {user.isDeleted ? (
                    <>
                      <button 
                        onClick={() => handleRestoreUser(user.id, `${user.firstname} ${user.lastname}`)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 rounded-md hover:bg-green-50 transition-colors"
                      >
                        Επαναφορά
                      </button>
                      <button 
                        onClick={() => handleHardDeleteUser(user.id, `${user.firstname} ${user.lastname}`)}
                        className="text-red-600 hover:text-red-900 text-sm font-bold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Οριστική Διαγραφή
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleDeleteUser(user.id, `${user.firstname} ${user.lastname}`)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Διαγραφή
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ΜΟΡΦΗ 2: Πίνακας για Desktop (κρυφό σε κινητά) */}
          <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ονοματεπώνυμο</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Επικοινωνία</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ρόλος</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Κατάσταση</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ενέργειες</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUsers.map((user) => (
                    <tr key={`desktop-${user.id}`} className={`transition-colors ${user.isDeleted ? 'bg-red-50/20 hover:bg-red-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* ΝΕΟ: Το όνομα είναι πλέον link (κουμπί) */}
                        <button 
                          onClick={() => navigate(`/app/admin/users/new?id=${user.id}`)}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors text-left"
                        >
                          {user.firstname} {user.lastname}
                        </button>
                        <div className="text-sm text-gray-500 mt-1">{user.place || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1.5">
                          {/* Κατάσταση Διαγραμμένου vs Ενεργού */}
                          {user.isDeleted ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-max bg-red-100 text-red-800">
                              Διεγραμμένος
                            </span>
                          ) : user.isActive ? (
                            <div className="flex items-center text-green-600" title="Ενεργοποιημένος Λογαριασμός">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-max bg-yellow-100 text-yellow-800">
                              Εκκρεμεί
                            </span>
                          )}
                          
                          {!user.isDeleted && user.isActive && user.role !== 'developer' && (
                            <span className={`text-xs font-medium ${user.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                              {user.isOnline ? '● Online' : '○ Offline'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.isDeleted ? (
                          <>
                            <button 
                              onClick={() => handleRestoreUser(user.id, `${user.firstname} ${user.lastname}`)}
                              className="text-green-600 hover:text-green-900 transition-colors mr-4"
                            >
                              Επαναφορά
                            </button>
                            <button 
                              onClick={() => handleHardDeleteUser(user.id, `${user.firstname} ${user.lastname}`)}
                              className="text-red-600 hover:text-red-900 font-bold transition-colors"
                            >
                              Οριστική Διαγραφή
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleDeleteUser(user.id, `${user.firstname} ${user.lastname}`)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Διαγραφή
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Users;
