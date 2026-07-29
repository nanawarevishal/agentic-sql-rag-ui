import { useEffect } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ChatPage } from "./pages/ChatPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { AdminUsagePage } from "./pages/AdminUsagePage";
import { ThemeToggle } from "./components/ThemeToggle";
import { LoginPage } from "./features/auth/LoginPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AdminRoute } from "./features/auth/AdminRoute";
import { UserMenu } from "./features/auth/UserMenu";
import { useRefreshSessionMutation } from "./features/auth/authApi";
import { authenticating, clearCredentials, setCredentials } from "./features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import "./App.css";

// Silently try to restore a session from the httpOnly refresh cookie on
// first load - lets a page reload survive without bouncing to /login while
// a valid cookie still exists.
function useAuthBootstrap() {
  const dispatch = useAppDispatch();
  const [refreshSession] = useRefreshSessionMutation();

  useEffect(() => {
    let cancelled = false;
    dispatch(authenticating());
    refreshSession()
      .unwrap()
      .then((session) => {
        if (!cancelled) dispatch(setCredentials(session));
      })
      .catch(() => {
        if (!cancelled) dispatch(clearCredentials());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function App() {
  useAuthBootstrap();
  const isAuthenticated = useAppSelector((state) => state.auth.status === "authenticated");
  const isAdmin = useAppSelector((state) => state.auth.user?.is_admin ?? false);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
              </svg>
            </span>
            <span className="brand-name">
              Agentic SQL <span className="brand-accent">RAG</span>
            </span>
          </div>

          {isAuthenticated && (
            <nav className="app-nav">
              <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                Query
              </NavLink>
              <NavLink to="/projects" className={({ isActive }) => (isActive ? "active" : "")}>
                Projects
              </NavLink>
              {isAdmin && (
                <NavLink to="/usage" className={({ isActive }) => (isActive ? "active" : "")}>
                  Usage
                </NavLink>
              )}
            </nav>
          )}

          <div className="app-header-actions">
            <UserMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/usage" element={<AdminUsagePage />} />
            </Route>
            {/* Back-compat: this page was /admin, then /data-sources, before
                data sources became one kind of project. */}
            <Route path="/admin" element={<Navigate to="/projects" replace />} />
            <Route path="/data-sources" element={<Navigate to="/projects" replace />} />
            <Route path="/admin/usage" element={<Navigate to="/usage" replace />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
