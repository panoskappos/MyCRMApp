import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCustomersCache } from "../context/CustomersCacheContext";
import { fetchCustomers } from "../services/customerService";
import type { Customer, PaginatedCustomers } from "../types";
import { CitySelect } from "../components/CitySelect";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Loader } from "../components/ui/Loader";
import { Modal } from "../components/ui/Modal";
import {
  Search,
  Plus,
  ChevronRight,
  Users,
  Building,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Filter,
  Edit,
  ChevronLeft
} from "lucide-react";

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { cache, saveCache } = useCustomersCache();
  const [paginatedData, setPaginatedData] = useState<PaginatedCustomers>(() => cache?.paginatedData ?? {
    customers: [],
    hasMore: false,
  });
  const [currentPage, setCurrentPage] = useState<number>(cache?.currentPage ?? 1); // ΝΕΟ: Κρατάμε τη σελίδα
  const [itemsPerPage, setItemsPerPage] = useState<number>(30); // ΝΕΟ: Δυναμικά items
  const [loading, setLoading] = useState(() => !cache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(cache?.searchTerm ?? "");
  const [activeSearchTerm, setActiveSearchTerm] = useState(cache?.activeSearchTerm ?? "");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">(cache?.filterStatus ?? "all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [expiryMonth, setExpiryMonth] = useState<number | null>(cache?.expiryMonth ?? null);
  const [cityFilter, setCityFilter] = useState(cache?.city ?? "");
  const [expiryWithinDays, setExpiryWithinDays] = useState<number | null>(cache?.expiryWithinDays ?? null);
  const [requireTaxNumber, setRequireTaxNumber] = useState<boolean>(cache?.requireTaxNumber ?? false);
  const [requireEmail, setRequireEmail] = useState<boolean>(cache?.requireEmail ?? false);
  const [requirePhone, setRequirePhone] = useState<boolean>(cache?.requirePhone ?? false);
  const [pendingFilterStatus, setPendingFilterStatus] = useState<"all" | "active" | "inactive">(filterStatus);
  const [pendingExpiryMonth, setPendingExpiryMonth] = useState<number | null>(expiryMonth);
  const [pendingCity, setPendingCity] = useState(cityFilter);
  const [pendingExpiryWithinDays, setPendingExpiryWithinDays] = useState<number | null>(expiryWithinDays);
  const [pendingRequireTaxNumber, setPendingRequireTaxNumber] = useState(requireTaxNumber);
  const [pendingRequireEmail, setPendingRequireEmail] = useState(requireEmail);
  const [pendingRequirePhone, setPendingRequirePhone] = useState(requirePhone);


  const statusLabel = {
    all: "Όλοι",
    active: "Ενεργοί",
    inactive: "Ανενεργοί"
  } as const;

  const monthOptions = [
    { value: null, label: "Όλοι οι μήνες" },
    { value: 0, label: "Ιανουάριος" },
    { value: 1, label: "Φεβρουάριος" },
    { value: 2, label: "Μάρτιος" },
    { value: 3, label: "Απρίλιος" },
    { value: 4, label: "Μάιος" },
    { value: 5, label: "Ιούνιος" },
    { value: 6, label: "Ιούλιος" },
    { value: 7, label: "Αύγουστος" },
    { value: 8, label: "Σεπτέμβριος" },
    { value: 9, label: "Οκτώβριος" },
    { value: 10, label: "Νοέμβριος" },
    { value: 11, label: "Δεκέμβριος" }
  ] as const;

  const expiryWindowOptions = [
    { value: null, label: "Όλες οι ημερομηνίες" },
    { value: 7, label: "Επόμενες 7 ημέρες" },
    { value: 30, label: "Επόμενες 30 ημέρες" },
    { value: 90, label: "Επόμενες 90 ημέρες" },
    { value: 180, label: "Επόμενες 180 ημέρες" },
  ] as const;

  const summaryParts: string[] = [];
  if (filterStatus !== "all") summaryParts.push(statusLabel[filterStatus]);
  if (expiryMonth !== null) summaryParts.push(monthOptions.find(option => option.value === expiryMonth)?.label ?? "");
  if (cityFilter.trim()) summaryParts.push(`Πόλη: ${cityFilter.trim()}`);
  if (expiryWithinDays !== null) summaryParts.push(`Λήξη ≤ ${expiryWithinDays}ημ`);
  if (requireTaxNumber) summaryParts.push("Με ΑΦΜ");
  if (requireEmail) summaryParts.push("Με Email");
  if (requirePhone) summaryParts.push("Με Τηλέφωνο");
  const filterSummary = summaryParts.length ? summaryParts.join(" • ") : "Χωρίς φίλτρα";

  // Υπολογισμός δυναμικού πλέγματος (Items per page)
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 768) setItemsPerPage(5);
      else if (width < 1024) setItemsPerPage(8);
      else setItemsPerPage(30);
    };
    updateItemsPerPage(); // Κλήση στην αρχή
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  useEffect(() => {
    if (!isFilterModalOpen) return;
    setPendingFilterStatus(filterStatus);
    setPendingExpiryMonth(expiryMonth);
    setPendingCity(cityFilter);
    setPendingExpiryWithinDays(expiryWithinDays);
    setPendingRequireTaxNumber(requireTaxNumber);
    setPendingRequireEmail(requireEmail);
    setPendingRequirePhone(requirePhone);
    

  }, [
    isFilterModalOpen,
    filterStatus,
    expiryMonth,
    cityFilter,
    expiryWithinDays,
    requireTaxNumber,
    requireEmail,
    requirePhone
  ]);

  // Load customers function
  const loadCustomers = useCallback(async (
    options: {
      reset?: boolean;
      searchTerm?: string;
      isActive?: boolean;
      expiryMonth?: number | null;
      city?: string;
      expiryWithinDays?: number | null;
      requireTaxNumber?: boolean;
      requireEmail?: boolean;
      requirePhone?: boolean;
    } = {}
  ) => {
    const {
      reset = false,
      searchTerm: search,
      isActive,
      expiryMonth: month,
      city,
      expiryWithinDays: expiryWithinDaysOption,
      requireTaxNumber: requireTaxNumberOption,
      requireEmail: requireEmailOption,
      requirePhone: requirePhoneOption,
    } = options;

    const resolvedSearch = search ?? activeSearchTerm;
    const resolvedIsActive = isActive !== undefined
      ? isActive
      : (filterStatus === "all" ? undefined : filterStatus === "active");
    const resolvedExpiryMonth = month !== undefined ? month : expiryMonth;
    const resolvedCity = city ?? cityFilter;
    const resolvedExpiryWithinDays = expiryWithinDaysOption !== undefined ? expiryWithinDaysOption : expiryWithinDays;
    const resolvedRequireTaxNumber = requireTaxNumberOption ?? requireTaxNumber;
    const resolvedRequireEmail = requireEmailOption ?? requireEmail;
    const resolvedRequirePhone = requirePhoneOption ?? requirePhone;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
        setCurrentPage(1); // Μηδενίζουμε τη σελίδα όταν κάνουμε νέα αναζήτηση/φιλτράρισμα
      } else {
        setLoadingMore(true);
      }

      const result = await fetchCustomers({
        searchTerm: resolvedSearch,
        isActive: resolvedIsActive,
        lastVisible: reset ? undefined : paginatedData.lastVisible,
        expiryMonth: resolvedExpiryMonth,
        city: resolvedCity,
        expiryWithinDays: resolvedExpiryWithinDays,
        requireTaxNumber: resolvedRequireTaxNumber,
        requireEmail: resolvedRequireEmail,
        requireMobile: resolvedRequirePhone, 
        limit: itemsPerPage
      });

      setPaginatedData(prevData => ({
        customers: reset ? result.customers : [...prevData.customers, ...result.customers],
        hasMore: result.hasMore,
        lastVisible: result.lastVisible,
        total: result.total
      }));

    } catch (err) {
      console.error("Error loading customers:", err);
      setError(err instanceof Error ? err.message : "Σφάλμα κατά τη φόρτωση");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    activeSearchTerm,
    filterStatus,
    expiryMonth,
    cityFilter,
    expiryWithinDays,
    requireTaxNumber,
    requireEmail,
    requirePhone,
    paginatedData.lastVisible,
    itemsPerPage
  ]);

  // Manual search function
  const handleSearch = () => {
    const isActive = filterStatus === "all" ? undefined : filterStatus === "active";
    const trimmed = searchTerm.trim();
    setActiveSearchTerm(trimmed);
    loadCustomers({
      reset: true,
      searchTerm: trimmed,
      isActive,
      expiryMonth,
      city: cityFilter,
      expiryWithinDays,
      requireTaxNumber,
      requireEmail,
      requirePhone
    });
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Initial load (use cache if available)
  const initialLoadDone = React.useRef(false);
  useEffect(() => {
    if (!cache && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadCustomers({ reset: true });
    }
  }, [cache, loadCustomers]);


  useEffect(() => {
    if (loading || error) return;
    saveCache({
      searchTerm,
      activeSearchTerm,
      filterStatus,
      expiryMonth,
      city: cityFilter,
      expiryWithinDays,
      requireTaxNumber,
      requireEmail,
      requirePhone,
      paginatedData,
      currentPage,  // Σώζουμε και τη σελίδα στην cache
      savedAt: Date.now(),
    });
  }, [
    loading,
    error,
    searchTerm,
    activeSearchTerm,
    filterStatus,
    expiryMonth,
    cityFilter,
    expiryWithinDays,
    requireTaxNumber,
    requireEmail,
    requirePhone,
    paginatedData,
    currentPage,
    saveCache
  ]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPendingExpiryMonth(value === "" ? null : Number(value));
  };

  const handleExpiryWindowChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setPendingExpiryWithinDays(value === "" ? null : Number(value));
  };

  const handleApplyFilters = () => {
    const appliedStatus = pendingFilterStatus;
    const appliedMonth = pendingExpiryMonth;
    const appliedCity = pendingCity.trim();
    const appliedExpiryWindow = pendingExpiryWithinDays ?? null;
    const isActive = appliedStatus === "all" ? undefined : appliedStatus === "active";

    setFilterStatus(appliedStatus);
    setExpiryMonth(appliedMonth);
    setCityFilter(appliedCity);
    setExpiryWithinDays(appliedExpiryWindow);
    setRequireTaxNumber(pendingRequireTaxNumber);
    setRequireEmail(pendingRequireEmail);
    setRequirePhone(pendingRequirePhone);
    setIsFilterModalOpen(false);

    loadCustomers({
      reset: true,
      searchTerm: activeSearchTerm,
      isActive,
      expiryMonth: appliedMonth,
      city: appliedCity,
      expiryWithinDays: appliedExpiryWindow,
      requireTaxNumber: pendingRequireTaxNumber,
      requireEmail: pendingRequireEmail,
      requirePhone: pendingRequirePhone
    });
  };

  const handleResetFilters = () => {
    // Μηδενίζουμε ΜΟΝΟ τα προσωρινά (pending) states του Modal
    // Δεν κλείνουμε το Modal και δεν κάνουμε κανένα request στη βάση
    setPendingFilterStatus("all");
    setPendingExpiryMonth(null);
    setPendingCity("");
    setPendingExpiryWithinDays(null);
    setPendingRequireTaxNumber(false);
    setPendingRequireEmail(false);
    setPendingRequirePhone(false);
  };

  const canAddCustomers = role && ['admin', 'office', 'developer'].includes(role);

  // --- ΛΟΓΙΚΗ ΣΕΛΙΔΟΠΟΙΗΣΗΣ (PAGINATION LOGIC) ---
  // Παίρνουμε το απόλυτο σύνολο από το Backend (ή το μήκος των customers αν φιλτράρουμε)
  const totalItems = paginatedData.total || paginatedData.customers.length;

  // Υπολογίζουμε τις συνολικές σελίδες (Ν) με βάση το απόλυτο σύνολο
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 0;

  // Πόσες σελίδες έχουμε ήδη κατεβάσει από το Firebase;
  const totalFetchedPages = Math.ceil(paginatedData.customers.length / itemsPerPage);

  // Υπολογισμός των πελατών που θα φανούν σε ΑΥΤΗ τη σελίδα
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCustomers = paginatedData.customers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = async (page: number) => {
    if (page > totalFetchedPages && paginatedData.hasMore) {
      await loadCustomers({ reset: false });
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Πελατολόγιο</h1>
            <p className="text-gray-600">Διαχείριση πελατών και καταστημάτων</p>
          </div>
        </div>
        <Loader message="Φόρτωση πελατών..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Πελατολόγιο</h1>
            <p className="text-gray-600">Διαχείριση πελατών και καταστημάτων</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={() => loadCustomers({ reset: true })}
                variant="outline"
              >
                Δοκιμάστε Ξανά
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-row justify-between \">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Πελατολόγιο</h1>
            <p className="text-sm sm:text-base text-gray-600">
              {paginatedData.customers.length === 0
                ? "Δεν βρέθηκαν πελάτες"
                : `Σελίδα ${currentPage} από ${totalPages}`}
            </p>

          </div>
          <div className="flex gap-2 items-center">
            {canAddCustomers && (
              <Button onClick={() => navigate('/app/customers/new')} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Νέος Πελάτης
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Αναζήτηση πελάτη..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1 sm:flex-initial">
                    <Search className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Αναζήτηση</span>
                  </Button>
                  {activeSearchTerm && (
                    <Button
                      onClick={() => {
                        setSearchTerm("");
                        setActiveSearchTerm("");
                        loadCustomers({
                          reset: true,
                          searchTerm: "",
                          isActive: filterStatus === "all" ? undefined : filterStatus === "active",
                          expiryMonth,
                          city: cityFilter,
                          expiryWithinDays,
                          requireTaxNumber,
                          requireEmail,
                          requirePhone
                        });
                      }}
                      variant="outline"
                      className="flex-1 sm:flex-initial text-red-500 hover:text-red-700 hover:bg-red-50 border-slate-200"
                    >
                      <span className="hidden sm:inline">Καθαρισμός</span>
                      <span className="sm:hidden font-bold">✕</span>
                    </Button>
                  )}
                  <div className="relative flex-1 sm:flex-initial">
                    <Button
                      onClick={() => setIsFilterModalOpen(true)}
                      variant="outline"
                      className={`w-full flex items-center justify-center gap-2 border-slate-200 hover:border-blue-300 hover:bg-sky-50 text-slate-700 ${isFilterModalOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""}`}
                    >
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="hidden sm:inline">Φίλτρα</span>
                      <span className="text-xs sm:text-sm text-blue-600 text-center truncate max-w-[160px] flex-1 font-medium">
                        {filterSummary}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {(summaryParts.length > 0 || activeSearchTerm) && (
              <div className="mt-3 text-xs sm:text-sm text-slate-500 space-y-1">
                {summaryParts.length > 0 && (
                  <div>Ενεργά φίλτρα: {filterSummary}</div>
                )}
                {activeSearchTerm && (
                  <div>Αναζήτηση για: "{activeSearchTerm}"</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer List - ΕΜΦΑΝΙΖΟΥΜΕ ΠΛΕΟΝ ΤΟΥΣ CURRENT CUSTOMERS */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {currentCustomers.map((customer, index) => (
            <CustomerCard key={`${customer.customerID}-${index}`} customer={customer} />
          ))}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loadingMore}
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Προηγούμενη</span>
            </Button>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                const isPageNotFetchedYet = page > totalFetchedPages + 1;

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    disabled={loadingMore || isPageNotFetchedYet}
                    className={`min-w-[36px] ${currentPage === page ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : ""}`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loadingMore}
            >
              <span className="hidden sm:inline">Επόμενη</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {paginatedData.customers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν βρέθηκαν πελάτες</h3>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Φίλτρα πελατών"
      >
        <div className="flex flex-col gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Κατάσταση πελάτη</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                variant={pendingFilterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setPendingFilterStatus("all")}
              >
                Όλοι
              </Button>
              <Button
                variant={pendingFilterStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setPendingFilterStatus("active")}
              >
                Ενεργοί
              </Button>
              <Button
                variant={pendingFilterStatus === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setPendingFilterStatus("inactive")}
              >
                Ανενεργοί
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Μήνας λήξης</div>
              <select
                value={pendingExpiryMonth === null ? "" : pendingExpiryMonth}
                onChange={handleMonthChange}
                className="w-full border rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                {monthOptions.map(option => (
                  <option key={option.label} value={option.value === null ? "" : option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Πόλη</div>
              <CitySelect
                value={pendingCity}
                onChange={(val) => setPendingCity(val)}
                placeholder="Π.χ. Αθήνα"

              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Παράθυρο λήξης</div>
              <select
                value={pendingExpiryWithinDays === null ? "" : pendingExpiryWithinDays}
                onChange={handleExpiryWindowChange}
                className="w-full border rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              >
                {expiryWindowOptions.map(option => (
                  <option key={option.label} value={option.value === null ? "" : option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Στοιχεία επικοινωνίας</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-400"
                    checked={pendingRequireTaxNumber}
                    onChange={(e) => setPendingRequireTaxNumber(e.target.checked)}
                  />
                  Με ΑΦΜ
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-400"
                    checked={pendingRequireEmail}
                    onChange={(e) => setPendingRequireEmail(e.target.checked)}
                  />
                  Με Email
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-400"
                    checked={pendingRequirePhone}
                    onChange={(e) => setPendingRequirePhone(e.target.checked)}
                  />
                  Με Τηλέφωνο
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <Button onClick={handleApplyFilters} disabled={loading}>
              Εφαρμογή φίλτρων
            </Button>
            <Button variant="ghost" onClick={handleResetFilters}>
              Καθαρισμός φίλτρων
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const CustomerCard: React.FC<{ customer: Customer }> = ({ customer }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [storeCount, setStoreCount] = useState<number>(0);
  const [totalExtinguishers, setTotalExtinguishers] = useState<number>(0);
  const [stores, setStores] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const canDelete = role && ['admin', 'developer'].includes(role);
  const canEdit = role && ['admin', 'office', 'developer'].includes(role);

  // Load store and extinguisher counts dynamically
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const { getStoresByCustomerId, getFireExtinguishersByCustomerId } = await import('../services/customerService');
        const customerStores = await getStoresByCustomerId(customer.customerID);
        const extinguishers = await getFireExtinguishersByCustomerId(customer.customerID);
        setStoreCount(customerStores.length);
        setTotalExtinguishers(extinguishers.length);
        setStores(customerStores);
      } catch (error) {
        console.error("Error loading counts:", error);
      }
    };
    loadCounts();
  }, [customer.customerID]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τον πελάτη "${customer.name}"? Θα διαγραφούν όλα τα καταστήματα, πυροσβεστήρες και ελέγχοι. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`)) {
      return;
    }

    try {
      setDeleting(true);
      const { deleteCustomer } = await import('../services/customerService');
      await deleteCustomer(customer.customerID);
      // Reload the page to refresh the customer list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Σφάλμα κατά τη διαγραφή του πελάτη");
      setDeleting(false);
    }
  };

  const firstStore = stores[0];

  return (
    <div className="relative h-full">
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
        style={{ borderColor: 'var(--border)' }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-2" style={{ color: 'var(--primary-gray)' }}>
              {customer.name || "Χωρίς όνομα"}
            </CardTitle>
            <div className={`
              inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
              ${customer.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
              }
            `}>
              {customer.isActive ? "Ενεργός" : "Ανενεργός"}
            </div>
          </div>
          <div className="text-sm" style={{ color: 'var(--light-gray)' }}>
            <div>ID: {customer.customerID || 'Χωρίς κωδικό'}</div>
            {customer.taxNumber && <div>ΑΦΜ: {customer.taxNumber}</div>}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-2 text-sm mb-4 flex-1" style={{ color: 'var(--light-gray)' }}>
            {customer.city && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                {customer.city}
              </div>
            )}
            {(customer.mobile || customer.land_line) && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                {[customer.mobile, customer.land_line].filter(Boolean).join(" / ")}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                {customer.email}
              </div>
            )}
            {firstStore?.address && (
              <div className="text-xs text-gray-500">
                {firstStore.address}
              </div>
            )}
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2 text-gray-400" />
              {storeCount} κατάστημα{storeCount !== 1 ? 'τα' : ''}
              {totalExtinguishers > 0 && `, ${totalExtinguishers} πυροσβεστήρες`}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => navigate(`/app/customers/${customer.customerID}/stores`)}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center"
            >
              <Building className="h-4 w-4 mr-2" />
              Καταστήματα ({storeCount})
            </button>
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/app/customers/new?id=${customer.customerID}`);
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-sky-50 hover:border-sky-300 text-slate-700 hover:text-blue-600 text-sm font-medium transition-colors flex items-center justify-center"
                title="Επεξεργασία πελάτη"
              >
                <Edit className="h-4 w-4 text-blue-600" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
                title="Διαγραφή πελάτη"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
