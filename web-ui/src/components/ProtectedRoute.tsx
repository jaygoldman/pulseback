import { Navigate } from "react-router-dom";
import { isLoggedIn, isAdmin } from "../api";

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
