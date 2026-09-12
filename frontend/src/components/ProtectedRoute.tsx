import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-msg">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Frontend gating is a UX convenience only - every API call is
  // independently re-checked by requireRole on the server.
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
