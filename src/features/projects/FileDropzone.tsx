import { useRef, useState } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string[];
  maxBytes?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Drag-and-drop file picker. Files are held in the wizard's state and only
// uploaded after the project exists, so adding and removing here is free -
// nothing has been sent yet.
export function FileDropzone({ files, onChange, accept, maxBytes }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Rejections are surfaced per file rather than as one summary line: with
  // several files dropped at once, "some files were rejected" leaves the
  // user guessing which.
  const rejected = maxBytes ? files.filter((f) => f.size > maxBytes) : [];

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      // Same name AND size is the practical duplicate test for a picker -
      // File has no stable identity across two separate drops.
      if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
    }
    onChange(next);
  }

  return (
    <div className="project-field">
      <span className="project-field-label">
        Documents<span className="project-field-required"> *</span>
      </span>

      <div
        className={`dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="dropzone-primary">
          <strong>Choose files</strong> or drag them here
        </span>
        <span className="dropzone-hint">
          {accept?.length ? accept.join("  ") : "Any supported document"}
          {maxBytes ? ` · up to ${Math.round(maxBytes / 1024 / 1024)} MB each` : ""}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept?.join(",")}
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so picking the same file again still fires onChange
            // after it has been removed from the list.
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-chips">
          {files.map((file) => {
            const tooBig = maxBytes !== undefined && file.size > maxBytes;
            return (
              <li key={`${file.name}-${file.size}`} className={`file-chip ${tooBig ? "is-invalid" : ""}`}>
                <span className="file-chip-name">{file.name}</span>
                <span className="file-chip-size">{formatBytes(file.size)}</span>
                {tooBig && <span className="file-chip-error">too large</span>}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(files.filter((f) => !(f.name === file.name && f.size === file.size)));
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {rejected.length > 0 && (
        <span className="project-field-error">
          Remove the oversized file{rejected.length > 1 ? "s" : ""} before continuing.
        </span>
      )}
    </div>
  );
}
