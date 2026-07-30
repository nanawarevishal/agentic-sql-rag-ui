import { useEffect, useMemo, useState } from "react";
import { parseErrorBody } from "../../lib/parseErrorBody";
import { FileDropzone } from "./FileDropzone";
import { ProjectFieldInput } from "./ProjectFieldInput";
import { ProjectTypeIcon } from "./ProjectTypeIcon";
import { defaultConfigFor, missingRequiredFields } from "./projectConfig";
import {
  useCreateProjectMutation,
  useGetProjectTypesQuery,
  useTriggerProjectIngestMutation,
  useUploadProjectDocumentsMutation,
  type ProjectTypeDescriptor,
} from "./projectsApi";

interface Props {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
}

type Step = "type" | "config";

// Create a project in two steps: pick a type, then fill in the form that type
// published. Nothing here knows what a SQL project or a document project
// actually needs - GET /projects/types says, and this renders it. The upload
// step keys off `supports_upload` rather than the type name, for the same
// reason.
export function CreateProjectWizard({ onCreated, onCancel }: Props) {
  const { data: types = [], isLoading, error: typesError } = useGetProjectTypesQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [uploadDocuments, { isLoading: isUploading }] = useUploadProjectDocumentsMutation();
  const [triggerIngest] = useTriggerProjectIngestMutation();

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<ProjectTypeDescriptor | null>(null);
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Validation stays quiet until a submit is attempted - flagging a required
  // field the moment the dialog opens scolds the user for not having typed
  // anything yet.
  const [submitted, setSubmitted] = useState(false);

  const busy = isCreating || isUploading;

  // Escape closes the dialog, and the page behind it doesn't scroll while
  // it's open - both are baseline expectations of a modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel, busy]);

  // Skip the type step when only one type is installed - making someone
  // "choose" from a list of one is pure ceremony.
  useEffect(() => {
    if (types.length === 1 && !selectedType) chooseType(types[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const missing = useMemo(
    () => (selectedType ? missingRequiredFields(selectedType.fields, config) : []),
    [selectedType, config]
  );
  const oversized = useMemo(
    () => files.some((f) => selectedType?.max_upload_bytes && f.size > selectedType.max_upload_bytes),
    [files, selectedType]
  );

  function chooseType(descriptor: ProjectTypeDescriptor) {
    setSelectedType(descriptor);
    setConfig(defaultConfigFor(descriptor.fields));
    setError(null);
    setSubmitted(false);
    setStep("config");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedType) return;
    setSubmitted(true);
    setError(null);

    if (!name.trim() || missing.length > 0) return;
    if (selectedType.supports_upload && files.length === 0) return;
    if (oversized) return;

    try {
      const project = await createProject({
        name: name.trim(),
        type: selectedType.type,
        config,
      }).unwrap();

      // Upload THEN ingest, in that order: ingest builds the index from
      // whatever documents exist at that moment, so triggering it first
      // would index an empty project and report it ready.
      if (selectedType.supports_upload && files.length > 0) {
        const result = await uploadDocuments({ id: project.id, files }).unwrap();
        if (result.accepted.length === 0) {
          setError(
            `No documents were accepted. ${result.skipped
              .map((s) => `${s.filename}: ${s.reason}`)
              .join("; ")}`
          );
          return;
        }
        await triggerIngest(project.id).unwrap();
      }

      onCreated(project.id);
    } catch (err) {
      setError(parseErrorBody((err as { data?: unknown })?.data) ?? "Could not create the project.");
    }
  }

  const nameInvalid = submitted && !name.trim();
  const filesInvalid = submitted && selectedType?.supports_upload && files.length === 0;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="New project">
        <header className="modal-header">
          <div>
            <h3>New project</h3>
            <p>{step === "type" ? "What should it answer from?" : selectedType?.description}</p>
          </div>
          <button type="button" className="modal-close" onClick={onCancel} disabled={busy} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Only meaningful when there is a genuine choice to make. */}
        {types.length > 1 && (
          <ol className="stepper">
            <li className={step === "type" ? "is-current" : "is-done"}>
              <span className="stepper-dot">1</span> Type
            </li>
            <li className={step === "config" ? "is-current" : ""}>
              <span className="stepper-dot">2</span> Details
            </li>
          </ol>
        )}

        <div className="modal-body">
          {isLoading && <p className="project-wizard-status">Loading project types…</p>}

          {!isLoading && (typesError || types.length === 0) && (
            <p className="project-wizard-error">
              No project types are available. Check that the backend is reachable.
            </p>
          )}

          {!isLoading && types.length > 0 && step === "type" && (
            <div className="project-type-grid">
              {types.map((descriptor) => (
                <button
                  key={descriptor.type}
                  type="button"
                  className="project-type-card"
                  onClick={() => chooseType(descriptor)}
                >
                  <span className="project-type-icon">
                    <ProjectTypeIcon name={descriptor.icon} />
                  </span>
                  <span className="project-type-label">{descriptor.label}</span>
                  <span className="project-type-description">{descriptor.description}</span>
                </button>
              ))}
            </div>
          )}

          {!isLoading && selectedType && step === "config" && (
            <form id="create-project-form" className="project-form" onSubmit={handleSubmit}>
              <label className={`project-field ${nameInvalid ? "is-invalid" : ""}`} htmlFor="project-name">
                <span className="project-field-label">
                  Name<span className="project-field-required"> *</span>
                </span>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  placeholder="Field operations handbook"
                  onChange={(e) => setName(e.target.value)}
                />
                {nameInvalid && <span className="project-field-error">Give the project a name.</span>}
              </label>

              {selectedType.fields.map((field) => (
                <ProjectFieldInput
                  key={field.name}
                  field={field}
                  value={config[field.name]}
                  invalid={submitted && missing.includes(field.label)}
                  onChange={(value) => setConfig((c) => ({ ...c, [field.name]: value }))}
                />
              ))}

              {selectedType.supports_upload && (
                <>
                  <FileDropzone
                    files={files}
                    onChange={setFiles}
                    accept={selectedType.accepted_extensions}
                    maxBytes={selectedType.max_upload_bytes}
                  />
                  {filesInvalid && (
                    <span className="project-field-error">Add at least one document.</span>
                  )}
                </>
              )}

              {error && <p className="project-wizard-error">{error}</p>}
            </form>
          )}
        </div>

        {!isLoading && selectedType && step === "config" && (
          <footer className="modal-footer">
            {types.length > 1 ? (
              <button type="button" className="link-button" onClick={() => setStep("type")} disabled={busy}>
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button type="submit" form="create-project-form" className="btn-primary" disabled={busy}>
                {isUploading ? (
                  <>
                    <span className="spinner" />
                    Uploading
                  </>
                ) : isCreating ? (
                  <>
                    <span className="spinner" />
                    Creating
                  </>
                ) : (
                  "Create project"
                )}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
