import { useCallback, useEffect, useRef, useState } from "react";

// How long a "deleted" item stays recoverable before the request actually
// goes out. Long enough to read the toast and react, short enough that the
// list isn't misrepresenting server state for any meaningful stretch.
export const UNDO_GRACE_MS = 7000;

export interface PendingDelete {
  id: string;
  label: string;
}

interface Options {
  onCommitted?: (id: string) => void;
  onFailed?: (item: PendingDelete) => void;
}

// Holds a delete for a grace period so the UI can offer Undo, then fires the
// real mutation. The backend still hard-deletes; this only buys the user a
// window to change their mind, so it deliberately errs towards *committing*
// rather than dropping: scheduling a second delete flushes the first, and so
// does unmounting, since navigating away isn't an undo. (A closed tab mid
// window does lose the delete - that needs a real soft-delete endpoint.)
export function usePendingDelete(commit: (id: string) => Promise<unknown>, options: Options = {}) {
  const [pending, setPending] = useState<PendingDelete | null>(null);

  // The commit path runs from a timer and from unmount cleanup, long after
  // the render that scheduled it, so everything it touches is read through a
  // ref rather than captured in a closure.
  const pendingRef = useRef<PendingDelete | null>(null);
  const timerRef = useRef<number | null>(null);
  const commitRef = useRef(commit);
  const optionsRef = useRef(options);

  useEffect(() => {
    commitRef.current = commit;
    optionsRef.current = options;
  });

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = useCallback(() => {
    clearTimer();
    const item = pendingRef.current;
    if (!item) return;
    pendingRef.current = null;
    setPending(null);
    commitRef
      .current(item.id)
      .then(() => optionsRef.current.onCommitted?.(item.id))
      .catch(() => optionsRef.current.onFailed?.(item));
  }, []);

  const schedule = useCallback(
    (item: PendingDelete) => {
      flush();
      pendingRef.current = item;
      setPending(item);
      timerRef.current = window.setTimeout(flush, UNDO_GRACE_MS);
    },
    [flush]
  );

  const undo = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Cleanup only - `flush` is stable, so this runs on unmount and nowhere else.
  useEffect(() => flush, [flush]);

  return { pending, schedule, undo };
}
