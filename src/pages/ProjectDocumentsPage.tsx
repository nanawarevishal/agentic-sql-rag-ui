import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileDropzone } from "../features/projects/FileDropzone";
import {
  useGetProjectDocumentsQuery,
  useGetProjectTypesQuery,
  useGetProjectsQuery,
  useTriggerProjectIngestMutation,
  useUploadProjectDocumentsMutation,
  type ProjectDocument,
} from "../features/projects/projectsApi";
import { parseErrorBody } from "../lib/parseErrorBody";

// A document project's files, each with the metadata ingest extracted from
// it. Retrieval narrows by these fields and conflict resolution decides by
// them, so a wrong effective date or a missed supersession shows up here
// before it shows up as a wrong answer.

function DocumentRow({ doc }: { doc: ProjectDocument }) {
  const revision = [doc.doc_number, doc.version && `rev ${doc.version}`].filter(Boolean).join(" ");
  return (
    <tr>
      <td>
        <span className="doc-title">{doc.title || doc.filename}</span>
        {doc.title && <span className="doc-filename">{doc.filename}</span>}
        {doc.error_message && <span className="ds-error">{doc.error_message}</span>}
      </td>
      <td>
        {/* Superseded outranks "ready": the document is indexed, but answers
            prefer whichever edition replaced it. */}
        {doc.superseded ? (
          <span className="ds-status ds-status-superseded">superseded</span>
        ) : (
          <span className={`ds-status ds-status-${doc.status}`}>{doc.status}</span>
        )}
      </td>
      <td>{doc.doc_type ?? "-"}</td>
      <td>{revision || "-"}</td>
      <td>{doc.effective_date ?? "-"}</td>
      <td>{doc.applies_to ?? "-"}</td>
      <td>{doc.page_count ?? "-"}</td>
      <td>{doc.chunks.toLocaleString()}</td>
    </tr>
  );
}

export function ProjectDocumentsPage() {
  const { projectId = "" } = useParams();
  const { data: projects = [], isLoading: projectsLoading } = useGetProjectsQuery();
  const project = projects.find((p) => p.id === projectId);
  const isPending = project?.status === "pending";
  useGetProjectsQuery(undefined, { pollingInterval: isPending ? 3000 : 0 });

  const {
    data: documents = [],
    isLoading,
    isError,
    refetch,
  } = useGetProjectDocumentsQuery(projectId, { skip: !project, pollingInterval: isPending ? 3000 : 0 });

  // Documents are finished before the project is marked ready, but the last
  // poll can land between the two - one more fetch on the way out of
  // "pending" picks up the final metadata.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending) refetch();
    wasPending.current = isPending;
  }, [isPending, refetch]);

  const { data: types = [] } = useGetProjectTypesQuery();
  const descriptor = types.find((t) => t.type === project?.type);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<{ kind: "error" | "note"; text: string } | null>(null);
  const [uploadDocuments, { isLoading: isUploading }] = useUploadProjectDocumentsMutation();
  const [triggerIngest, { isLoading: isTriggering }] = useTriggerProjectIngestMutation();
  const busy = isUploading || isTriggering;

  async function addDocuments() {
    setMessage(null);
    try {
      const result = await uploadDocuments({ id: projectId, files }).unwrap();
      const skipped = result.skipped.map((s) => `${s.filename}: ${s.reason}`).join("; ");
      if (result.accepted.length === 0) {
        setMessage({ kind: "error", text: `No documents were accepted. ${skipped}` });
        return;
      }
      // Upload then ingest, as in the create wizard: ingest indexes whatever
      // is uploaded at that moment.
      await triggerIngest(projectId).unwrap();
      setFiles([]);
      if (skipped) setMessage({ kind: "note", text: `Some files were skipped. ${skipped}` });
    } catch (err) {
      setMessage({
        kind: "error",
        text: parseErrorBody((err as { data?: unknown })?.data) ?? "Could not add the documents.",
      });
    }
  }

  if (!project) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <div className="admin-card-body">
            {projectsLoading ? (
              <div className="loading-banner">
                <span className="dot-pulse" />
                Loading...
              </div>
            ) : (
              <p className="ds-meta">
                This project doesn't exist or isn't visible to you. <Link to="/projects">All projects</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <Link to="/projects" className="doc-back-link">
              All projects
            </Link>
            <h2>
              {project.name} <span className={`ds-status ds-status-${project.status}`}>{project.status}</span>
            </h2>
            <p>
              {documents.length} document{documents.length === 1 ? "" : "s"}
              {project.last_ingested_at &&
                ` · last indexed ${new Date(project.last_ingested_at).toLocaleString()}`}
            </p>
          </div>
        </div>

        <div className="admin-card-body">
          {project.error_message && <p className="ds-error">{project.error_message}</p>}

          {isError ? (
            <p className="ds-error">Couldn't load the documents.</p>
          ) : isLoading ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <p className="ds-meta">No documents yet.</p>
          ) : (
            <div className="doc-table-wrap">
              <table className="trace-rows-table doc-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Number</th>
                    <th>Effective</th>
                    <th>Applies to</th>
                    <th>Pages</th>
                    <th>Chunks</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {descriptor?.supports_upload && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Add documents</h2>
              <p>The whole project is re-indexed afterwards, so answers may be unavailable for a few minutes.</p>
            </div>
          </div>
          <div className="admin-card-body doc-add">
            <FileDropzone
              files={files}
              onChange={setFiles}
              accept={descriptor.accepted_extensions}
              maxBytes={descriptor.max_upload_bytes}
            />
            {message && (
              <p className={message.kind === "error" ? "ds-error" : "ds-meta"} role="status">
                {message.text}
              </p>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={files.length === 0 || busy || isPending}
              aria-busy={busy}
              onClick={addDocuments}
            >
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Uploading
                </>
              ) : (
                "Upload and re-index"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
