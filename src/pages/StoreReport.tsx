import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { Customer, Store, FireExtinguisher } from "../types";
import { Loader } from "../components/ui/Loader";
import { Logo } from "../components/ui/Logo";
import { BackButton } from "../components/ui/BackButton";

export const StoreReport: React.FC = () => {
  const { customerId, storeId } = useParams<{ customerId: string; storeId: string }>();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [fireExtinguishers, setFireExtinguishers] = useState<FireExtinguisher[]>([]);
  const [loading, setLoading] = useState(true);

  // Get selected extinguisher IDs and date from URL parameters
  const selectedIds = searchParams.get('selected')?.split(',').filter(Boolean) || [];
  const selectedDate = searchParams.get('date') || null;

  useEffect(() => {
    const fetchData = async () => {
      if (!customerId || !storeId) return;

      try {
        const { getCustomerById, getStoreById, getFireExtinguishersWithInspectionsByStoreId } = await import('../services/customerService');

        const [customerData, storeData, extinguishersData] = await Promise.all([
          getCustomerById(customerId),
          getStoreById(storeId),
          getFireExtinguishersWithInspectionsByStoreId(storeId, true) // Include inactive inspections for reports
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

        // Filter extinguishers if selectedIds is provided
        if (selectedIds.length > 0) {
          let filtered = extinguishersData.filter(ext => selectedIds.includes(ext.extinguisherID));

          // If date is provided, filter inspections to only show that date
          if (selectedDate) {
            filtered = filtered.map(ext => ({
              ...ext,
              inspections: ext.inspections && ext.inspections[selectedDate]
                ? { [selectedDate]: ext.inspections[selectedDate] }
                : {}
            }));
          }

          setFireExtinguishers(filtered);
        } else {
          setFireExtinguishers(extinguishersData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, storeId, selectedIds.join(','), selectedDate]);

  // Set document title for PDF naming
  useEffect(() => {
    if (customer && store) {
      // Remove spaces and special characters for filename
      const cleanName = String(customer.name || 'Report').replace(/\s+/g, '');
      document.title = cleanName;
    }

    // Reset title when component unmounts
    return () => {
      document.title = 'MyCRMApp';
    };
  }, [customer, store]);

  if (loading) {
    return <Loader message="Φόρτωση ελέγχου..." />;
  }

  if (!customer || !store) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 text-center">
          <p className="text-red-600">Δεν βρέθηκε το κατάστημα.</p>
        </div>
      </div>
    );
  }

  // Get all unique inspection dates from all extinguishers (include all for report viewing)
  const allInspectionDates = [...new Set(
    fireExtinguishers
      .flatMap(ext => Object.keys(ext.inspections || {}))
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const ROWS_PER_PAGE = 14;

  // Build paginated data: for each inspection date, chunk extinguishers into groups of 14
  const pages: { inspectionDate: string; extinguishers: FireExtinguisher[]; startIndex: number }[] = [];
  allInspectionDates.forEach((inspectionDate) => {
    const extinguishersForDate = fireExtinguishers.filter(ext => ext.inspections?.[inspectionDate]);
    for (let i = 0; i < extinguishersForDate.length; i += ROWS_PER_PAGE) {
      pages.push({
        inspectionDate,
        extinguishers: extinguishersForDate.slice(i, i + ROWS_PER_PAGE),
        startIndex: i,
      });
    }
  });

  const renderTableRows = (extinguishers: FireExtinguisher[], inspectionDate: string, startIndex: number) =>
    extinguishers.map((ext, index) => {
      const inspection = ext.inspections[inspectionDate];
      const isAnnual = inspection?.maintenanceType === "ΕΤΗΣΙΑ";
      const is5Year = inspection?.maintenanceType === "5-ΕΤΗΣ";
      const is10Year = inspection?.maintenanceType === "10-ΕΤΗΣ";
      const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";
      const globalIndex = startIndex + index;
      const checkStyle = { width: 'clamp(10px, 2vw, 14px)', height: 'clamp(10px, 2vw, 14px)', lineHeight: 'clamp(10px, 2vw, 14px)', fontSize: 'clamp(7px, 1.5vw, 9px)' };

      return (
        <tr key={`${ext.extinguisherID}-${globalIndex}`} className={rowBg}>
          {/* <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center font-semibold text-gray-700" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{ext.aaNumber || globalIndex + 1}</td> */}

          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center font-semibold text-gray-700" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>
            {globalIndex + 1}
          </td>

          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{ext.type || ""}</td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{ext.extinguisherID || ""}</td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{ext.shellNumber || ""}</td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center text-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{ext.manufacturingYear || ""}</td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center text-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>{inspection?.lastRefillDate || ""}</td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-green-50">
            {isAnnual && <span className="inline-block bg-green-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-green-50">
            {is5Year && <span className="inline-block bg-green-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-green-50">
            {is10Year && <span className="inline-block bg-green-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-amber-50">
            {inspection?.dischargeHose && <span className="inline-block bg-amber-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-amber-50">
            {inspection?.lock && <span className="inline-block bg-amber-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-amber-50">
            {inspection?.pressureGauge && <span className="inline-block bg-amber-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-amber-50">
            {inspection?.safetyPin && <span className="inline-block bg-amber-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-amber-50">
            {inspection?.repairKitLock && <span className="inline-block bg-amber-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-red-50">
            {inspection?.sale && <span className="inline-block bg-red-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
          <td className="border-2 border-gray-600 px-1 sm:px-2 py-0.5 sm:py-1 text-center bg-purple-50">
            {inspection?.unsuitable && <span className="inline-block bg-purple-500 text-white rounded-full font-bold" style={checkStyle}>✓</span>}
          </td>
        </tr>
      );
    });

  const renderPageHeader = (inspectionDate: string) => (
    <>
      {/* Company Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 pb-1 border-b border-gray-200 gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-blue-600 italic text-[10px] sm:text-xs font-semibold">ΤΕΧΝΙΚΟΣ ΕΛΕΓΧΟΣ & ΣΥΝΤΗΡΗΣΗ</p>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-700">ΥΠΗΡΕΣΙΕΣ ΠΥΡΑΣΦΑΛΕΙΑΣ</p>
        </div>
        <div className="flex-shrink-0">
          <Logo size="sm" />
        </div>
      </div>

      {/* Customer Name */}
      <div className="mb-1 bg-blue-100 rounded-md overflow-hidden border border-blue-200">
        <div className="px-2 py-0.5 bg-blue-50 border-b border-blue-200">
          <span className="text-[9px] font-bold text-blue-600 uppercase">ΠΕΛΑΤΗΣ</span>
        </div>
        <div className="px-2 py-1">
          <div className="font-bold text-gray-900 text-base print:text-sm">
            {customer.name}
            {store.storeName && (
              <span className="text-gray-600 font-normal text-xs ml-2">({store.storeName})</span>
            )}
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2 print:mb-1 items-stretch">
        <div className="flex-1 flex gap-2">
          <div className="flex-1">
            <div className="text-[8px] font-bold text-gray-600 uppercase mb-0.5">ΚΩΔΙΚΟΣ ΠΕΛΑΤΗ</div>
            <div className="bg-amber-50 border border-amber-300 rounded px-1 py-1 print:py-0.5 text-center font-bold text-gray-900 text-xs">
              {customer.customerID}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[8px] font-bold text-gray-600 uppercase mb-0.5">ΚΩΔΙΚΟΣ ΚΑΤΑΣΤΗΜΑΤΟΣ</div>
            <div className="bg-white border border-gray-300 rounded px-1 py-1 print:py-0.5 text-center font-bold text-gray-900 text-xs">
              {store.storeID}
            </div>
          </div>
        </div>
        <div className="flex-[1.5] bg-blue-700 rounded flex flex-col items-center justify-center py-0.5 px-2 text-white shadow-sm">
          <div className="text-[9px] font-bold uppercase tracking-wider">ΗΜΕΡΟΜΗΝΙΑ ΕΠΑΝΕΛΕΓΧΟΥ</div>
          <div className="text-xl sm:text-2xl print:text-xl font-black tracking-wide">
            {fireExtinguishers[0]?.inspections[inspectionDate]?.recheckDate
              ? new Date(fireExtinguishers[0].inspections[inspectionDate].recheckDate!).toLocaleDateString('el-GR')
              : '-'}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[8px] font-bold text-gray-600 uppercase mb-0.5">ΥΠΕΥΘΥΝΟΣ</div>
          <div className="bg-white border border-gray-300 rounded px-1 py-1 print:py-0.5 text-center font-bold text-gray-900 text-xs">
            {fireExtinguishers[0]?.inspections[inspectionDate]?.responsible || 'Υπεύθυνος Ελέγχου'}
          </div>
        </div>
      </div>
    </>
  );

  const renderPageFooter = (inspectionDate: string) => (
    <div className="mt-auto pt-2 print:pt-1">
      <div className="bg-white rounded p-2 sm:p-3 print:p-1.5 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs mb-2 print:mb-1">
          <div className="flex items-center gap-1 p-1.5 print:p-1 bg-green-50 rounded border-l-2 border-green-500">
            <span className="font-bold text-green-700 whitespace-nowrap text-[9px] print:text-[8px]">Ετήσια Συντήρηση:</span>
            <span className="text-gray-700 text-[9px] print:text-[8px] truncate">Έλεγχος & Συντήρηση & Αναγόμωση</span>
          </div>
          <div className="flex items-center gap-1 p-1.5 print:p-1 bg-blue-50 rounded border-l-2 border-blue-500">
            <span className="font-bold text-blue-700 whitespace-nowrap text-[9px] print:text-[8px]">5-Ετής Συντήρηση:</span>
            <span className="text-gray-700 text-[9px] print:text-[8px] truncate">Εκτεταμένη Συντήρηση & Αναγόμωση</span>
          </div>
          <div className="flex items-center gap-1 p-1.5 print:p-1 bg-purple-50 rounded border-l-2 border-purple-500">
            <span className="font-bold text-purple-700 whitespace-nowrap text-[9px] print:text-[8px]">10-Ετής Συντήρηση:</span>
            <span className="text-gray-700 text-[9px] print:text-[8px] truncate">Εκτεταμένη Συντήρηση & Αναγόμωση & Επανέλε...</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2 print:pt-1">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 print:p-1.5 rounded">
              <div className="font-bold text-blue-800 mb-1 uppercase text-[9px] print:text-[8px]">Υπεύθυνος Ελέγχου</div>
              <div className="text-blue-800 font-bold text-xs sm:text-sm print:text-xs">
                {fireExtinguishers[0]?.inspections[inspectionDate]?.responsible || 'Υπεύθυνος Ελέγχου'}
              </div>
            </div>
            <div className="bg-gray-50 p-2 print:p-1.5 rounded text-right">
              <div className="font-bold text-gray-800 mb-1 uppercase text-[9px] print:text-[8px]">Ημερομηνία Ελέγχου:</div>
              <div className="text-gray-700 font-semibold text-xs sm:text-sm print:text-xs">
                {new Date(inspectionDate).toLocaleDateString('el-GR')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTableHeader = () => (
    <thead>
      <tr className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>Α/Α</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΠΥΡΟΣΒΕΣΤΗΡΑΣ</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>S/N</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΚΕΛΥΦΟΣ</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΕΤΟΣ<br />ΚΑΤΑΣΚΕΥΗΣ</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΕΤΟΣ<br />ΤΕΛΕΥΤΑΙΑΣ<br />ΑΝΑΓΟΜΩΣΗΣ</th>
        <th colSpan={3} className="border-2 border-gray-800 px-1 sm:px-2 py-1 sm:py-1.5 font-bold bg-green-700" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΣΥΝΤΗΡΗΣΗ</th>
        <th colSpan={5} className="border-2 border-gray-800 px-1 sm:px-2 py-1 sm:py-1.5 font-bold bg-amber-600" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΑΝΤΙΚΑΤΑΣΤΑΣΗ<br />ΕΞΑΡΤΗΜΑΤΟΣ</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold bg-slate-700" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΠΩΛΗΣΗ</th>
        <th rowSpan={2} className="border-2 border-gray-800 px-1 sm:px-2 py-1.5 sm:py-2 font-bold bg-purple-700" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)' }}>ΑΚΑΤΑΛΗΛΟΣ</th>
      </tr>
      <tr className="bg-gray-100 text-gray-700">
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>ΕΤ.</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>5ΕΤ</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>10ΕΤ</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>Σωλήνας<br />εκτόξευσης</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>Κλείστρο</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>Μανόμετρο</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>Ασφαλιστικό</th>
        <th className="border-2 border-gray-600 px-0.5 sm:px-1 py-0.5 sm:py-1 font-semibold" style={{ fontSize: 'clamp(6px, 1.3vw, 8px)' }}>Κιτ επισκευής<br />Κλείστρου</th>
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 print:bg-white print:p-0">
      {/* Screen-only header with Back Button and PDF Button */}
      <div className="max-w-full mx-auto mb-3 print:hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <BackButton className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  Έλεγχος - {store.storeName}
                </h1>
                <p className="text-xs text-gray-600">
                  Κωδικός: {store.storeID} | Πελάτης: {customer.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2 self-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report pages — each .report-page = one printed A4 landscape page */}
      {pages.length === 0 ? (
        <div className="max-w-full mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            Δεν βρέθηκαν πυροσβεστήρες ή ελέγχοι για αυτό το κατάστημα.
          </div>
        </div>
      ) : (
        pages.map((page, pageIndex) => (
          <div
            key={`page-${pageIndex}`}
            className="report-page bg-white rounded-lg shadow-md p-3 w-full mb-4 print:mb-0 print:rounded-none print:shadow-none"
            style={{ fontFamily: 'Roboto, system-ui, -apple-system, sans-serif' }}
          >
            {renderPageHeader(page.inspectionDate)}

            {/* Table */}
            <div className="flex-1 overflow-scroll">
              <table className="w-full border-collapse border-2 border-gray-800" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)', fontFamily: 'Roboto, Arial, sans-serif' }}>
                {renderTableHeader()}
                <tbody className="bg-white">
                  {renderTableRows(page.extinguishers, page.inspectionDate, page.startIndex)}
                </tbody>
              </table>
            </div>

            {renderPageFooter(page.inspectionDate)}
          </div>
        ))
      )}
    </div>
  );
};

export default StoreReport;
