import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DeleteFailedToast, UndoToast } from "../components/UndoToast";
import { usePendingDelete } from "../hooks/usePendingDelete";
import { CreateProjectWizard } from "../features/projects/CreateProjectWizard";
import {
  useDeleteProjectMutation,
  useGetProjectStatsQuery,
  useGetProjectsQuery,
  useTriggerProjectIngestMutation,
  type Project,
} from "../features/projects/projectsApi";
import { statFigures } from "../lib/projectStats";

// Formerly AdminPage ("Data sources"). Same page, generalized: it lists
// projects of every type and creates them through the schema-driven wizard
// instead of a hardcoded connection-string form.

function ProjectRow({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [triggerIngest, { isLoading: isIngesting }] = useTriggerProjectIngestMutation();
  const [showStats, setShowStats] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    data: stats,
    isFetching: statsLoading,
    isError: statsFailed,
  } = useGetProjectStatsQuery(project.id, { skip: !showStats });
  const figures = statFigures(stats?.stats ?? {});
  const vectorsError = stats?.stats.namespaces_error;

  return (
    <div className="ds-item">
      <div className="ds-item-main">
        <div className="ds-item-title">
          <span>{project.name}</span>
          <span className="ds-kind">{project.type === "doc_rag" ? "documents" : "database"}</span>
          <span className={`ds-status ds-status-${project.status}`}>{project.status}</span>
        </div>
        {project.error_message && <p className="ds-error">{project.error_message}</p>}
        <p className="ds-meta">
          Created {new Date(project.created_at).toLocaleString()}
          {project.last_ingested_at &&
            ` · last indexed ${new Date(project.last_ingested_at).toLocaleString()}`}
        </p>
        {showStats && (
          <div className="ds-stats" id={`stats-${project.id}`}>
            {statsFailed ? (
              <p className="ds-error">Couldn't load stats.</p>
            ) : figures.length > 0 ? (
              <dl>
                {figures.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="ds-meta">{statsLoading ? "Loading stats..." : "Nothing indexed yet."}</p>
            )}
            {typeof vectorsError === "string" && (
              <p className="ds-meta">Vector counts unavailable: {vectorsError}</p>
            )}
          </div>
        )}
      </div>
      <div className="ds-item-actions">
        {project.type === "doc_rag" && (
          <Link className="btn-secondary" to={`/projects/${project.id}`}>
            Documents
          </Link>
        )}
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={showStats}
          aria-controls={`stats-${project.id}`}
          onClick={() => setShowStats((v) => !v)}
        >
          {showStats ? "Hide stats" : "Stats"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={isIngesting}
          aria-busy={isIngesting}
          onClick={() => triggerIngest(project.id)}
        >
          {isIngesting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Re-indexing
            </>
          ) : (
            "Re-index"
          )}
        </button>
        {!project.is_builtin && (
          <button
            type="button"
            className="btn-secondary ds-delete"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        )}
        {/* Heavier than deleting a conversation - it takes the index (and,
            for a document project, the uploaded files) with it - so this
            keeps a confirm on top of the undo window rather than relying on
            the undo window alone. */}
        {confirmingDelete && (
          <ConfirmDialog
            title={`Delete "${project.name}"?`}
            confirmLabel="Delete project"
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={() => {
              setConfirmingDelete(false);
              onDelete();
            }}
          >
            <p>
              Its index will be removed and the agent will no longer be able to query it. You'll have a
              few seconds to undo.
            </p>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}

export function ProjectsPage() {
  // Poll only while something is actually mid-index, so a
  // pending -> ready/failed transition shows up without a manual refresh and
  // polling goes idle once everything has settled. Document projects index
  // out-of-process, so this is also what surfaces the remote's status.
  const { data: projects = [], isFetching } = useGetProjectsQuery();
  const hasPending = projects.some((p) => p.status === "pending");
  useGetProjectsQuery(undefined, { pollingInterval: hasPending ? 3000 : 0 });

  const [showWizard, setShowWizard] = useState(false);

  // Held at page level rather than per row so the list can hide the pending
  // row and only ever one undo toast is on screen.
  const [deleteProject] = useDeleteProjectMutation();
  const {
    pending: pendingDelete,
    schedule: scheduleDelete,
    undo: undoDelete,
    failed: failedDelete,
    dismissFailed: dismissFailedDelete,
  } = usePendingDelete((id) => deleteProject(id).unwrap());
  const visibleProjects = projects.filter((p) => p.id !== pendingDelete?.id);

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2>Projects</h2>
            <p>Everything the agent can answer from - each with its own isolated index.</p>
          </div>
          {!showWizard && (
            <button type="button" className="btn-primary" onClick={() => setShowWizard(true)}>
              New project
            </button>
          )}
        </div>
        <div className="admin-card-body">
          {isFetching && projects.length === 0 ? (
            <div className="loading-banner">
              <span className="dot-pulse" />
              Loading...
            </div>
          ) : (
            <div className="ds-list">
              {visibleProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onDelete={() => scheduleDelete({ id: project.id, label: project.name })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rendered as a modal rather than a card appended below the list: as a
          card it sat off-screen under a full list, and the list stayed in
          view competing with the form for attention. */}
      {showWizard && (
        <CreateProjectWizard
          onCreated={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {pendingDelete && (
        <UndoToast message={`Deleted "${pendingDelete.label}"`} onUndo={undoDelete} />
      )}
      {failedDelete && <DeleteFailedToast label={failedDelete.label} onDismiss={dismissFailedDelete} />}
    </div>
  );
}
