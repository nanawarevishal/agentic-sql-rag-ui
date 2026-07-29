import { useEffect, useMemo, useState } from "react";
import { parseErrorBody } from "../../lib/parseErrorBody";
import { ProjectFieldInput } from "./ProjectFieldInput";
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

// Create a project in two steps: pick a type, then fill in the form that
// type published. Nothing here knows what a SQL project or a document
// project actually needs - GET /projects/types says, and this renders it.
//
// The upload step is likewise driven by `supports_upload` rather than by
// checking for type === "doc_rag", so a future type that takes files gets it
// without a change here.
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

  // Skip the type step entirely when only one type is installed - making
  // someone "choose" from a list of one is pure ceremony.
  useEffect(() => {
    if (types.length === 1 && !selectedType) {
      chooseType(types[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const missing = useMemo(
    () => (selectedType ? missingRequiredFields(selectedType.fields, config) : []),
    [selectedType, config]
  );

  function chooseType(descriptor: ProjectTypeDescriptor) {
    setSelectedType(descriptor);
    setConfig(defaultConfigFor(descriptor.fields));
    setError(null);
    setStep("config");
  }

  function updateField(fieldName: string, value: unknown) {
    setConfig((current) => ({ ...current, [fieldName]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedType) return;

    setError(null);
    if (!name.trim()) {
      setError("Give the project a name.");
      return;
    }
    if (missing.length > 0) {
      setError(`Fill in: ${missing.join(", ")}`);
      return;
    }
    if (selectedType.supports_upload && files.length === 0) {
      setError("Add at least one document.");
      return;
    }

    try {
      const project = await createProject({
        name: name.trim(),
        type: selectedType.type,
        config,
      }).unwrap();

      // Upload THEN ingest, in that order: ingest builds the index from
      // whatever documents exist at that moment, so triggering it first
      // would index an empty project and report ready.
      if (selectedType.supports_upload && files.length > 0) {
        const result = await uploadDocuments({ id: project.id, files }).unwrap();
        if (result.accepted.length === 0) {
          const reasons = result.skipped.map((s) => `${s.filename}: ${s.reason}`).join("; ");
          setError(`No documents were accepted. ${reasons}`);
          return;
        }
        await triggerIngest(project.id).unwrap();
      }

      onCreated(project.id);
    } catch (err) {
      setError(parseErrorBody((err as { data?: unknown })?.data) ?? "Could not create the project.");
    }
  }

  if (isLoading) return <p className="project-wizard-status">Loading project types…</p>;

  if (typesError || types.length === 0) {
    return (
      <div className="project-wizard">
        <p className="project-wizard-error">
          No project types are available. Check that the backend is reachable.
        </p>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  if (step === "type" || !selectedType) {
    return (
      <div className="project-wizard">
        <h3>What kind of project?</h3>
        <div className="project-type-grid">
          {types.map((descriptor) => (
            <button
              key={descriptor.type}
              type="button"
              className="project-type-card"
              onClick={() => chooseType(descriptor)}
            >
              <span className="project-type-label">{descriptor.label}</span>
              <span className="project-type-description">{descriptor.description}</span>
            </button>
          ))}
        </div>
        <button type="button" className="link-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  const busy = isCreating || isUploading;

  return (
    <form className="project-wizard" onSubmit={handleSubmit}>
      <div className="project-wizard-header">
        <h3>New {selectedType.label} project</h3>
        {types.length > 1 && (
          <button type="button" className="link-button" onClick={() => setStep("type")}>
            Change type
          </button>
        )}
      </div>

      <label className="project-field" htmlFor="project-name">
        <span className="project-field-label">
          Name<span className="project-field-required"> *</span>
        </span>
        <input
          id="project-name"
          value={name}
          placeholder="Q3 reports"
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      {selectedType.fields.map((field) => (
        <ProjectFieldInput
          key={field.name}
          field={field}
          value={config[field.name]}
          onChange={(value) => updateField(field.name, value)}
        />
      ))}

      {selectedType.supports_upload && (
        <label className="project-field" htmlFor="project-files">
          <span className="project-field-label">
            Documents<span className="project-field-required"> *</span>
          </span>
          <input
            id="project-files"
            type="file"
            multiple
            accept={selectedType.accepted_extensions?.join(",")}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <span className="project-field-help">
            {selectedType.accepted_extensions?.join(", ")}
            {selectedType.max_upload_bytes
              ? ` · up to ${Math.round(selectedType.max_upload_bytes / 1024 / 1024)} MB each`
              : ""}
          </span>
          {files.length > 0 && (
            <span className="project-field-help">{files.length} file(s) selected</span>
          )}
        </label>
      )}

      {error && <p className="project-wizard-error">{error}</p>}

      <div className="project-wizard-actions">
        <button type="submit" disabled={busy}>
          {isUploading ? "Uploading…" : isCreating ? "Creating…" : "Create project"}
        </button>
        <button type="button" className="link-button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
