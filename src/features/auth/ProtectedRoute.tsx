import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { ChartFocusProvider } from "../../components/ChartFocusProvider";
import { ChatProvider } from "../../components/ChatProvider";

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

  // Chat + chart-focus state live here, above the routed pages, rather than
  // inside ChatPage - so they persist (and an in-flight answer keeps
  // streaming) while the user is on Data Sources or Usage, instead of being
  // torn down and rebuilt every time they navigate back to "/".
  return (
    <ChartFocusProvider>
      <ChatProvider>
        <Outlet />
      </ChatProvider>
    </ChartFocusProvider>
  );
}
