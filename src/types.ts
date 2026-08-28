import { Timestamp } from "firebase/firestore";

export const Role = {
  Admin: 'admin',
  Office: 'office',
  Delivery: 'delivery',
  Developer: 'developer',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface User {
  uid: string;
  firstname: string;
  lastname: string;
  email: string;
  role: Role;
  phone: string;
  place: string;
  isOnline: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLogin?: Timestamp;
}

export type InspectionType = "ΕΤΗΣΙΑ" | "5-ΕΤΗΣ" | "10-ΕΤΗΣ";

export interface Inspection {
  inspectionDate: string | null;
  recheckDate: string | null; // Changed from reinspectionDate to match new DB
  customer: string | null; // Added to match new DB structure
  responsible: string | null; // Added to match new DB structure
  maintenanceType: string | null; // Changed from inspectionType to match new DB
  status: string | null; // Added to match new DB structure
  isActive?: boolean;         // Active/Inactive status (defaults to true)
  // Checkboxes for ΑΝΤΙΚΑΤΑΣΤΑΣΗ ΕΞΑΡΤ. section - matching database field names
  // oRings?: boolean;           // O rings
  dischargeHose?: boolean;    // Σωλήνας εκτόξευσης (Discharge Hose) - renamed from hose
  lock?: boolean;             // Κλειστρο (Lock)
  pressureGauge?: boolean;    // ΜΑΝΟΜΕΤΡΟ (Pressure Gauge)
  safetyPin?: boolean;        // ΠΙΝΟ ΑΣΦΑΛΕΙΑΣ (Safety Pin)
  lastRefillDate?: string;    // Έτος τελευταίας αναγόμωσης (Year of last refill)
  repairKitLock?: boolean;    // Κιτ επισκευής Κλείστρου (Lock repair kit)
  sale?: boolean;             // Πώληση (Sale)
  unsuitable?: boolean;       // Ακατάληλος (Unsuitable)
}

export interface FireExtinguisher {
  extinguisherID: string;
  storeID: string;
  customerID: string;
  serialNumber: string | null;
  type: string | null;
  shellNumber: string | null; // Changed from shellType to match new DB
  manufacturer: string | null;
  manufacturingYear: string | null; // Changed from manufactureYear to match new DB
  aaNumber: number | null; // Added to match new DB structure
  sold: boolean; // For ΠΩΛΗΣΗ column (X mark if sold)
  inspections: Record<string, Inspection>; // Subcollection
}

export type StatusFireExtinguishers = "ΕΝΕΡΓΟΣ" | "ΑΝΕΝΕΡΓΟΣ" | "ΥΠΟ ΣΥΝΤΗΡΗΣΗ";

export interface Store {
  storeID: string; 
  customerID: string; 
  storeName: string | null;
  city: string | null;
  address: string | null;
  mobile: string | null;
  land_line: string | null;
  email: string | null;
  taxNumber: string | null; 
}

export interface Customer {
  customerID: string; // Changed from customerCode to match new DB
  name: string | null; // Changed from companyName to match new DB
  taxNumber: string | null; // Changed from afm to match new DB
  city: string | null;
  address: string | null;
  mobile: string | null;
  land_line: string | null;
  email: string | null;
  comments: string | null; // Changed from note to match new DB
  isActive: boolean;
  storeCount?: number;
  extinguisherCount?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Task {
  id?: string;
  date: string;
  time: string;
  title: string;
  description: string;
  assignedTo: 'OFFICE' | 'DELIVERY' | 'ALL' | 'USER';
  assignedUserId?: string | null;
  assignedUserEmail?: string | null;
  assignedUserName?: string | null;
  employee?: string | null;
  employee_role?: string | null;
  createdBy: string;
  completed: boolean;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
}

export interface PaginatedCustomers {
  customers: Customer[];
  hasMore: boolean;
  lastVisible?: any;
  total?: number;
}
