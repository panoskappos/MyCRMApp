import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Customers } from "./pages/Customers";
import { NewCustomer } from "./pages/NewCustomer";
import CustomerStores from "./pages/CustomerStores";
import NewStore from "./pages/NewStore";
import { FireExtinguishersList } from "./pages/FireExtinguishersList";
import { FireExtinguishers } from "./pages/FireExtinguishers";
import { InspectionHistory } from "./pages/InspectionHistory";
import { StoreReport } from "./pages/StoreReport";
import { NewInspection } from "./pages/NewInspection";
import { NewFireExtinguisher } from "./pages/NewFireExtinguisher";
import { ProjectCalendar } from "./pages/ProjectCalendar";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { Role } from "./types";
import { CustomersCacheProvider } from "./context/CustomersCacheContext";
import { ActivateAccount } from "./pages/ActivateAccount";
import { NewUser } from "./pages/NewUser";
import { Users } from "./pages/Users";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CustomersCacheProvider>
          <Routes>
            {/* --- ΔΗΜΟΣΙΑ ROUTES (Public) --- */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            
            {/* 2. Η ενεργοποίηση μεταφέρθηκε εδώ ώστε να είναι δημόσια προσβάσιμη */}
            <Route path="/activate-account" element={<ActivateAccount />} />

            {/* --- ΠΡΟΣΤΑΤΕΥΜΕΝΑ ROUTES (Protected with Layout) --- */}
            <Route path="/app" element={<Layout />}>
              <Route index element={<Navigate to="/app/home" replace />} />

              <Route
                path="home"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <Home />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <Customers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/new"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Developer]}>
                    <NewCustomer />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <CustomerStores />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/new"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Developer]}>
                    <NewStore />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/:storeId/extinguishers"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <FireExtinguishersList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/:storeId/extinguishers/new"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Developer]}>
                    <NewFireExtinguisher />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/:storeId/history"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <InspectionHistory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/:storeId"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <StoreReport />
                  </ProtectedRoute>
                }
              />

              <Route
                path="customers/:customerId/stores/:storeId/inspections/new"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Developer]}>
                    <NewInspection />
                  </ProtectedRoute>
                }
              />

              <Route
                path="fire-extinguishers"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <FireExtinguishers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="calendar"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Office, Role.Delivery, Role.Developer]}>
                    <ProjectCalendar />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Developer]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route 
                path="admin/users/"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Developer]}>
                    < Users/>
                  </ProtectedRoute>
                }
              />

              {/* 3. Προσθήκη του route για τη δημιουργία/πρόσκληση νέου χρήστη */}
              <Route 
                path="admin/users/new"
                element={
                  <ProtectedRoute allowedRoles={[Role.Admin, Role.Developer]}>
                    <NewUser />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch all - redirect to welcome */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CustomersCacheProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
