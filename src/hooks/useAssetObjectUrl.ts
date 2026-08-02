import { useEffect, useState } from "react";
import { useRefreshSessionMutation } from "../features/auth/authApi";
import { clearCredentials, setCredentials } from "../features/auth/authSlice";
import { singleFlightRefresh } from "../features/auth/singleFlightRefresh";
import { useAppDispatch, useAppSelector } from "../store/hooks";

// Same empty base URL as apiSlice.ts - relative paths, proxied in dev.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

// Fetch a passage's figure/table artifact and hand back a blob: URL.
//
// A doc passage's `asset_url` (/projects/{id}/assets/{chunk_id}) is proxied
// by the API precisely so the artifact stays behind the same auth as
// everything else - which means it needs an Authorization header, and an
// <img src> never sends one. So the bytes are fetched here and handed to
// the <img> as an object URL.
//
// Not RTK Query: its cache is the redux store, and parking Blobs there
// trips the serializability check and keeps every artifact of every turn in
// memory for the session. The object URL is revoked on unmount instead.
// Like useStreamingChat, that means duplicating apiSlice's auth header and
// its refresh-once-then-retry handling rather than sharing them.
export function useAssetObjectUrl(assetUrl: string | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [refreshSession] = useRefreshSessionMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!assetUrl) return;

    const controller = new AbortController();
    let created: string | null = null;
    let cancelled = false;

    const doFetch = (token: string | null) =>
      fetch(`${baseUrl}${assetUrl}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        signal: controller.signal,
      });

    (async () => {
      try {
        let res = await doFetch(accessToken);

        if (res.status === 401) {
          try {
            // Shared across every asset on the answer - see
            // singleFlightRefresh for why N parallel refreshes sign the
            // user out.
            const session = await singleFlightRefresh(() => refreshSession().unwrap());
            dispatch(setCredentials(session));
            res = await doFetch(session.access_token);
          } catch {
            dispatch(clearCredentials());
            throw new Error("Not authenticated");
          }
        }
        if (!res.ok) throw new Error(`Asset request failed (${res.status})`);

        const blob = await res.blob();
        // The effect was torn down while the bytes were in flight - creating
        // an object URL now would leak it, since cleanup has already run.
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
        setFailed(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (created) URL.revokeObjectURL(created);
      setObjectUrl(null);
    };
  }, [assetUrl, accessToken, dispatch, refreshSession]);

  return { objectUrl, failed };
}
