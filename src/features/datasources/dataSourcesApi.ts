// Mirrors app/api/routers/datasources.py on the backend.
import { api } from "../../api/apiSlice";

export type DataSourceKind = "connection" | "builtin";
export type DataSourceStatus = "pending" | "ready" | "failed";

export interface DataSource {
  id: string;
  name: string;
  kind: DataSourceKind;
  status: DataSourceStatus;
  error_message: string | null;
  schema_source: "introspect";
  created_at: string;
  last_ingested_at: string | null;
}

export interface DataSourceStats {
  status: string;
  stats: Record<string, unknown>;
}

const dataSourcesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDataSources: builder.query<DataSource[], void>({
      query: () => "/datasources",
      providesTags: ["DataSources"],
    }),
    createDataSource: builder.mutation<DataSource, { name: string; connection_string: string }>({
      query: (body) => ({ url: "/datasources", method: "POST", body }),
      invalidatesTags: ["DataSources"],
    }),
    deleteDataSource: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `/datasources/${id}`, method: "DELETE" }),
      invalidatesTags: ["DataSources"],
    }),
    triggerDataSourceIngest: builder.mutation<DataSource, string>({
      query: (id) => ({ url: `/datasources/${id}/ingest`, method: "POST" }),
      invalidatesTags: ["DataSources"],
    }),
    getDataSourceStats: builder.query<DataSourceStats, string>({
      query: (id) => `/datasources/${id}/stats`,
    }),
  }),
});

export const {
  useGetDataSourcesQuery,
  useCreateDataSourceMutation,
  useDeleteDataSourceMutation,
  useTriggerDataSourceIngestMutation,
  useGetDataSourceStatsQuery,
} = dataSourcesApi;
