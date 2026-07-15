import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

// Sits inside <ProtectedRoute>, so auth status is already resolved by the
// time this renders - only the is_admin check is new here.
export function AdminRoute() {
  const isAdmin = useAppSelector((state) => state.auth.user?.is_admin ?? false);

  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
