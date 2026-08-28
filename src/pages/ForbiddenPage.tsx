import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ShieldX, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader } from "../components/ui/Loader";

export const ForbiddenPage: React.FC = () => {
  const { role, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <Loader message="Έλεγχος δικαιωμάτων..." />;
  }

  if (role) {
    return <Navigate to="/app/home" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Δεν έχετε δικαίωμα πρόσβασης
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">
            Ο λογαριασμός σας δεν έχει ακόμη ρόλο στο σύστημα.
            Αποσυνδεθείτε και συνδεθείτε ξανά αφού ρυθμιστούν τα δικαιώματά σας.
          </p>
          <Button onClick={handleLogout} className="w-full flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            Αποσύνδεση
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

