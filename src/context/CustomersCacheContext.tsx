import React, { createContext, useContext, useCallback, useState, } from "react";
import type { PaginatedCustomers, Customer } from "../types";

type FilterStatus = "all" | "active" | "inactive";

export interface CustomersCacheState {
  searchTerm: string;
  activeSearchTerm: string;
  filterStatus: FilterStatus;
  expiryMonth: number | null;
  city: string;
  expiryWithinDays: number | null;
  requireTaxNumber: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  paginatedData: PaginatedCustomers;
  currentPage: number;
  savedAt: number;
}

// interface CustomersCacheContextValue {
//   cache: CustomersCacheState | null;
//   saveCache: (state: CustomersCacheState) => void;
//   clearCache: () => void;
// }

const CustomersCacheContext = createContext<CustomersCacheContextValue | undefined>(undefined);

// export const CustomersCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [cache, setCache] = useState<CustomersCacheState | null>(null);

//   const saveCache = useCallback((state: CustomersCacheState) => {
//     setCache(state);
//   }, []);

//   const clearCache = useCallback(() => {
//     setCache(null);
//   }, []);

//   return (
//     <CustomersCacheContext.Provider value={{ cache, saveCache, clearCache }}>
//       {children}
//     </CustomersCacheContext.Provider>
//   );
// };

export const useCustomersCache = (): CustomersCacheContextValue => {
  const context = useContext(CustomersCacheContext);
  if (!context) {
    throw new Error("useCustomersCache must be used within a CustomersCacheProvider");
  }
  return context;
};

interface CustomersCacheContextValue {
  cache: CustomersCacheState | null;
  saveCache: (state: CustomersCacheState) => void;
  clearCache: () => void;
  // NEW: Update a single customer inside the cached array
  updateCustomerInCache: (customerID: string, updatedFields: Partial<Customer>) => void;
}

export const CustomersCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<CustomersCacheState | null>(null);

  const saveCache = useCallback((state: CustomersCacheState) => {
    setCache(state);
  }, []);

  const clearCache = useCallback(() => {
    setCache(null);
  }, []);

  // NEW: Function to mutate only the updated customer in state
  const updateCustomerInCache = useCallback((customerID: string, updatedFields: Partial<Customer>) => {
    setCache((prevCache) => {
      if (!prevCache) return null;
      return {
        ...prevCache,
        paginatedData: {
          ...prevCache.paginatedData,
          customers: prevCache.paginatedData.customers.map((cust) =>
            cust.customerID === customerID ? { ...cust, ...updatedFields } : cust
          ),
        },
      };
    });
  }, []);

  return (
    <CustomersCacheContext.Provider value={{ cache, saveCache, clearCache, updateCustomerInCache }}>
      {children}
    </CustomersCacheContext.Provider>
  );
};
