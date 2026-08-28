import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Users, Calendar, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { getVocativeName } from "../lib/utils";


export const Home: React.FC = () => {
  const { userProfile, role } = useAuth();

  const quickActions = [
    {
      title: "Πελατολόγιο",
      description: "Διαχείριση πελατών και καταστημάτων",
      icon: Users,
      href: "/app/customers",
      color: "bg-blue-600",
    },
    {
      title: "Ημερολόγιο",
      description: "Προγραμματισμός εργασιών",
      icon: Calendar,
      href: "/app/calendar",
      color: "bg-blue-600",
    },
    ...(role === 'admin' || role === 'developer' ? [{
      title: "Διαχείριση",
      description: "Ρυθμίσεις συστήματος",
      icon: Settings,
      href: "/app/admin",
      color: "bg-blue-600",
    }] : []),
  ];

  const roleNames = {
    admin: "Διαχειριστής",
    office: "Γραφείο",
    delivery: "Διανομή",
    developer: "Developer"
  };

  return (
    <div className="space-y-6">
      {/* 2026 Welcome Banner */}
      <div className="relative rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 shadow-md overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-sky-400/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-sky-200 mb-3 border border-white/10">
            <span>●</span>
            <span>{roleNames[role as keyof typeof roleNames] || role}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Καλώς ήρθες, {getVocativeName(userProfile?.firstname)}!
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl">
            Πίνακας ελέγχου CRM. Επιλέξτε μία από τις παρακάτω ενέργειες για να ξεκινήσετε.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Γρήγορες Ενέργειες</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href} className="group">
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full border border-slate-200/80 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl text-white flex-shrink-0 ${action.color} shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
