// Mirrors app/api/routers/projects.py on the backend.
//
// Replaces dataSourcesApi.ts: a data source turned out to be one kind of
// project, and every id is unchanged across that rename (the backend
// migration preserved them), so nothing here needs a translation layer.
import { api } from "../../api/apiSlice";

export type ProjectType = "sql_rag" | "doc_rag";
export type ProjectStatus = "pending" | "ready" | "failed";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  error_message: string | null;
  is_builtin: boolean;
  created_at: string;
  last_ingested_at: string | null;
}

// --- Type descriptors -----------------------------------------------------
//
// The create wizard renders its config step from these rather than from
// hardcoded per-type forms, so adding a RAG type on the backend needs no
// change here. `kind` is the contract with the field renderer - a new kind
// DOES need a renderer change, so the backend sticks to these five.

export type ProjectFieldKind = "text" | "secret" | "number" | "boolean" | "select";

export interface ProjectFieldOption {
  value: string;
  label: string;
}

export interface ProjectField {
  name: string;
  label: string;
  kind: ProjectFieldKind;
  required?: boolean;
  default?: string | number | boolean;
  placeholder?: string;
  help?: string;
  options?: ProjectFieldOption[];
}

export interface ProjectTypeDescriptor {
  type: ProjectType;
  label: string;
  description: string;
  icon?: string;
  supports_upload?: boolean;
  requires_ingest?: boolean;
  accepted_extensions?: string[];
  max_upload_bytes?: number;
  fields: ProjectField[];
}

export interface ProjectStats {
  status: string;
  stats: Record<string, unknown>;
}

export interface UploadResult {
  status: string;
  accepted: Array<{ filename: string; size_bytes: number }>;
  skipped: Array<{ filename: string; reason: string }>;
}

const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Projects"],
    }),
    getProjectTypes: builder.query<ProjectTypeDescriptor[], void>({
      query: () => "/projects/types",
      // Not tagged: the set of installed RAG services doesn't change while
      // someone has the page open, and refetching it on every project
      // mutation would fan out to every remote service for nothing.
    }),
    createProject: builder.mutation<
      Project,
      { name: string; type: ProjectType; config: Record<string, unknown> }
    >({
      query: (body) => ({ url: "/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `/projects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Projects"],
    }),
    triggerProjectIngest: builder.mutation<Project, string>({
      query: (id) => ({ url: `/projects/${id}/ingest`, method: "POST" }),
      invalidatesTags: ["Projects"],
    }),
    getProjectStats: builder.query<ProjectStats, string>({
      query: (id) => `/projects/${id}/stats`,
    }),
    uploadProjectDocuments: builder.mutation<UploadResult, { id: string; files: File[] }>({
      query: ({ id, files }) => {
        // FormData, not JSON - fetchBaseQuery leaves the Content-Type unset
        // for it so the browser can add the multipart boundary itself.
        const body = new FormData();
        files.forEach((file) => body.append("files", file));
        return { url: `/projects/${id}/documents`, method: "POST", body };
      },
      invalidatesTags: ["Projects"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectTypesQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useTriggerProjectIngestMutation,
  useGetProjectStatsQuery,
  useUploadProjectDocumentsMutation,
} = projectsApi;
