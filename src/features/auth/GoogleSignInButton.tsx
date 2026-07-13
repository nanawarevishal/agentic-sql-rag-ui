import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../store/hooks";
import { clearCredentials, setCredentials } from "./authSlice";
import { useGoogleLoginMutation } from "./authApi";

// Google Identity Services - loaded lazily so a login-less visit never pays
// for it, rather than a build-time npm wrapper around the same script.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            try {
              const session = await googleLogin({ id_token: response.credential }).unwrap();
              dispatch(setCredentials(session));
            } catch {
              dispatch(clearCredentials());
              setLoadError("Sign-in failed. Please try again.");
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
        });
      })
      .catch(() => setLoadError("Couldn't load Google Sign-In. Check your connection and reload."));

    return () => {
      cancelled = true;
    };
  }, [dispatch, googleLogin]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="auth-status auth-status-error">
        Google sign-in isn't configured (missing VITE_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      {isLoading && <p className="auth-status">Signing in...</p>}
      {loadError && <p className="auth-status auth-status-error">{loadError}</p>}
    </div>
  );
}
