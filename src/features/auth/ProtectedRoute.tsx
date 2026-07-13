import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

// "idle"/"authenticating" cover the moment between mount and App.tsx's
// silent POST /auth/refresh resolving - treated as loading, not
// unauthenticated, so a page reload with a valid session doesn't flash the
// login page before bouncing back.
export function ProtectedRoute() {
  const status = useAppSelector((state) => state.auth.status);

  if (status === "idle" || status === "authenticating") {
    return (
      <div className="auth-loading">
        <span className="spinner" />
      </div>
    );
  }

  if (status !== "authenticated") return <Navigate to="/login" replace />;

  return <Outlet />;
}
