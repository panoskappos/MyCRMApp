import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Calendar,
  Home,
  LogOut,
  Menu,
  X,
  Settings,
  Flame
} from "lucide-react";
import { Button } from "./ui/Button";
import { Logo } from "./ui/Logo";
import { Role } from "../types";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  allowedRoles: Role[];
}

const navItems: NavItem[] = [
  {
    path: "/app/home",
    label: "Αρχική",
    icon: Home,
    allowedRoles: [Role.Admin, Role.Office, Role.Delivery, Role.Developer],
  },
  {
    path: "/app/customers",
    label: "Πελατολόγιο",
    icon: Users,
    allowedRoles: [Role.Admin, Role.Office, Role.Delivery, Role.Developer],
  },
  {
    path: "/app/fire-extinguishers",
    label: "Πυροσβεστήρες",
    icon: Flame,
    allowedRoles: [Role.Admin, Role.Office, Role.Delivery, Role.Developer],
  },
  {
    path: "/app/calendar",
    label: "Ημερολόγιο",
    icon: Calendar,
    allowedRoles: [Role.Admin, Role.Office, Role.Delivery, Role.Developer],
  },
  {
    path: "/app/admin",
    label: "Διαχείριση",
    icon: Settings,
    allowedRoles: [Role.Admin, Role.Developer],
  },
];

export const Layout: React.FC = () => {
  const { userProfile, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const filteredNavItems = navItems.filter(item =>
    role && item.allowedRoles.includes(role)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on print */}
      <aside className={`
        print:hidden fixed top-0 left-0 z-50 h-full w-full lg:w-64 bg-white border-r border-slate-200 shadow-sm transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
            <Logo size="sm" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              aria-label="Κλείσιμο μενού"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-semibold'
                      : 'text-slate-600 hover:bg-sky-50/80 hover:text-blue-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                {userProfile?.firstname ? userProfile.firstname.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {userProfile?.firstname} {userProfile?.lastname}
                </p>
                <p className="text-xs text-slate-500 capitalize truncate">
                  {role === Role.Admin && "Διαχειριστής"}
                  {role === Role.Office && "Γραφείο"}
                  {role === Role.Delivery && "Διανομή"}
                  {role === Role.Developer && "Developer"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="flex-shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 h-8 w-8 rounded-lg"
                title="Αποσύνδεση"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 print:pl-0">
        {/* Header - Glassmorphic */}
        <header className="print:hidden sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200/70 shadow-sm">
          <div className="flex h-16 items-center px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Άνοιγμα μενού"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
