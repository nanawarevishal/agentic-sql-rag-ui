import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function LoginPage() {
  const status = useAppSelector((state) => state.auth.status);

  if (status === "authenticated") return <Navigate to="/" replace />;

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Agentic SQL RAG</h1>
        <p>Sign in to ask questions and keep your conversation history.</p>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
