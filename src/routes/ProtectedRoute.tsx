import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { KstIdentifier, Role } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  allowedKst?: KstIdentifier;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedKst,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.activeRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedKst && user && !user.kstAccess.includes(allowedKst)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
