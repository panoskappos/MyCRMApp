import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Search, Flame, Calendar, MapPin, Building2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import type { FireExtinguisher } from "../types";
import { Button } from "../components/ui/Button";

interface ExtinguisherWithDetails extends FireExtinguisher {
  customerName?: string;
  storeName?: string;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
}

export const FireExtinguishers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [extinguishers, setExtinguishers] = useState<ExtinguisherWithDetails[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only allow numbers
    const numericSearch = searchTerm.replace(/\D/g, '');
    if (!numericSearch) {
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      // Search for fire extinguisher by ID (S/N) - using getDoc for exact match
      const extRef = doc(db, "fire_extinguishers", numericSearch);
      const extDoc = await getDoc(extRef);

      if (!extDoc.exists()) {
        setExtinguishers([]);
        setSearching(false);
        return;
      }

      const results: ExtinguisherWithDetails[] = [];
      const extData = { ...extDoc.data(), extinguisherID: extDoc.id } as FireExtinguisher;

      // Get customer name
      let customerName = "N/A";
      if (extData.customerID) {
        const { getCustomerById } = await import("../services/customerService");
        const customerData = await getCustomerById(extData.customerID);
        customerName = customerData?.name || "N/A";
      }

      // Get store name
      let storeName = "N/A";
      if (extData.storeID) {
        const { getStoreById } = await import("../services/customerService");
        const storeData = await getStoreById(extData.storeID);
        storeName = storeData?.storeName || "N/A";
      }

      // Get inspections from subcollection
      let lastInspectionDate = "Δεν υπάρχει";
      let nextInspectionDate = "Δεν υπάρχει";

      const inspectionsRef = collection(db, `fire_extinguishers/${extDoc.id}/inspections`);
      const inspectionsSnapshot = await getDocs(inspectionsRef);

      if (!inspectionsSnapshot.empty) {
        // Get most recent inspection by sorting dates
        const inspectionDates = inspectionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

        const mostRecentInspection = inspectionDates[0] as any;
        lastInspectionDate = new Date(mostRecentInspection.id).toLocaleDateString('el-GR');
        
        if (mostRecentInspection.recheckDate) {
          nextInspectionDate = new Date(mostRecentInspection.recheckDate).toLocaleDateString('el-GR');
        }
      }

      results.push({
        ...extData,
        customerName,
        storeName,
        lastInspectionDate,
        nextInspectionDate
      });

      setExtinguishers(results);
    } catch (error) {
      console.error("Error searching fire extinguishers:", error);
      setExtinguishers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '');
    setSearchTerm(value);
  };

  const handleCardClick = (ext: ExtinguisherWithDetails) => {
    if (ext.customerID && ext.storeID) {
      navigate(`/app/customers/${ext.customerID}/stores/${ext.storeID}/extinguishers`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Flame className="h-8 w-8 text-red-600" />
            Πυροσβεστήρες
          </h1>
          <p className="text-gray-600 mt-1">
            Αναζήτηση πυροσβεστήρα με S/N
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Εισάγετε S/N (μόνο αριθμούς)..."
                  className="pl-10 text-lg"
                  disabled={searching}
                />
              </div>
              <Button
                type="submit"
                disabled={searching || !searchTerm}
              >
                {searching ? "Αναζήτηση..." : "Αναζήτηση"}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Results */}
      {searching && <Loader message="Αναζήτηση πυροσβεστήρα..." />}

      {!searching && hasSearched && extinguishers.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <Flame className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Δεν βρέθηκε πυροσβεστήρας με S/N: <span className="font-semibold">{searchTerm}</span>
            </p>
          </div>
        </Card>
      )}

      {!searching && extinguishers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {extinguishers.map((ext) => (
            <Card
              key={ext.extinguisherID}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleCardClick(ext)}
            >
              <div className="p-6">
                {/* Header with S/N */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <Flame className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        S/N: {ext.extinguisherID}
                      </h3>
                      <p className="text-sm text-gray-600">{ext.type}</p>
                    </div>
                  </div>
                  {ext.sold && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                      ΠΩΛΗΘΗΚΕ
                    </span>
                  )}
                </div>

                {/* Fire Extinguisher Details */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Κατασκευαστής</p>
                    <p className="text-sm font-semibold text-gray-900">{ext.manufacturer || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Κέλυφος</p>
                    <p className="text-sm font-semibold text-gray-900">{ext.shellNumber || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase">Έτος Κατασκευής</p>
                    <p className="text-sm font-semibold text-gray-900">{ext.manufacturingYear || "N/A"}</p>
                  </div>
                </div>

                {/* Customer & Store Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Πελάτης:</span>
                    <span className="text-sm font-semibold text-gray-900">{ext.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Κατάστημα:</span>
                    <span className="text-sm font-semibold text-gray-900">{ext.storeName}</span>
                  </div>
                </div>

                {/* Inspection Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-blue-700 font-semibold uppercase">Τελευταίος Έλεγχος</p>
                    </div>
                    <p className="text-sm font-bold text-blue-900">{ext.lastInspectionDate}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <p className="text-xs text-green-700 font-semibold uppercase">Επόμενος Έλεγχος</p>
                    </div>
                    <p className="text-sm font-bold text-green-900">{ext.nextInspectionDate}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FireExtinguishers;
