import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

// A native <dialog> opened with showModal() gets focus trapping, Escape and an
// inert page behind it from the browser, which a div-based modal has to
// rebuild by hand. Cancel comes first in the DOM, so it is what showModal()
// focuses - a stray Enter backs out of a destructive action rather than
// confirming it.
//
// The parent owns open/closed: it renders this to open it and unmounts it to
// close it. Escape closes the element itself, so `close` is reported as a
// cancel; firing after a confirm as well is harmless, both just unmount.
export function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId} onClose={onCancel}>
      <header className="modal-header">
        <h3 id={titleId}>{title}</h3>
      </header>
      <div className="modal-body">{children}</div>
      <footer className="modal-footer">
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </footer>
    </dialog>
  );
}
