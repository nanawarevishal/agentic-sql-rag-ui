import type { CSSProperties } from "react";
import { UNDO_GRACE_MS } from "../hooks/usePendingDelete";

interface Props {
  message: string;
  onUndo: () => void;
}

// The bar drains over exactly the grace window, so "how long do I have?" is
// answered by looking at it rather than by guessing.
export function UndoToast({ message, onUndo }: Props) {
  return (
    <div
      className="undo-toast"
      role="status"
      aria-live="polite"
      style={{ "--undo-duration": `${UNDO_GRACE_MS}ms` } as CSSProperties}
    >
      <div className="undo-toast-row">
        <span className="undo-toast-text">{message}</span>
        <button type="button" className="undo-toast-action" onClick={onUndo}>
          Undo
        </button>
      </div>
      <span className="undo-toast-bar" />
    </div>
  );
}

// Same spot as the undo toast, for when the delete it offered went out and
// failed. No timer: the item is back in the list, and that should be read.
export function DeleteFailedToast({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <div className="undo-toast is-error" role="alert">
      <div className="undo-toast-row">
        <span className="undo-toast-text">Couldn't delete "{label}". It's back in the list.</span>
        <button type="button" className="undo-toast-action" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
