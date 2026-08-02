import type { SessionPayload } from "./authSlice";

// One refresh at a time, process-wide.
//
// The 401-then-refresh-then-retry dance is per-request, and several requests
// routinely run at once: an answer with four figures mounts four
// useAssetObjectUrl hooks that all fetch immediately. If the access token has
// expired, every one of them gets a 401 and every one of them posts
// /auth/refresh for the same session. The server rotates the refresh token, so
// the calls that land after the first are presenting a token that was just
// replaced - they fail, their callers dispatch clearCredentials, and the user
// is signed out in the middle of an answer that was about to render.
//
// So the first caller runs the refresh and everyone who arrives while it is in
// flight awaits the same promise. A rejection is shared too: if the session is
// genuinely gone, all of them should give up, not retry one after another.
let inFlight: Promise<SessionPayload> | null = null;

export function singleFlightRefresh(
  refresh: () => Promise<SessionPayload>
): Promise<SessionPayload> {
  if (!inFlight) {
    inFlight = refresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
