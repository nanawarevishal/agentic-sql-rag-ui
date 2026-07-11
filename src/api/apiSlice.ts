import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  HealthResponse,
  QueryRequest,
  QueryResponse,
  SchemaStatsResponse,
} from "../types";

// Empty base URL: in dev, Vite's proxy (see vite.config.ts) forwards
// these paths to the FastAPI backend; in prod, serve the built frontend
// behind the same reverse proxy as the API so paths stay relative.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    runQuery: builder.mutation<QueryResponse, QueryRequest>({
      query: (body) => ({ url: "/query", method: "POST", body }),
    }),
    getHealth: builder.query<HealthResponse, void>({
      query: () => "/health",
    }),
    getSchemaStats: builder.query<SchemaStatsResponse, void>({
      query: () => "/schema/stats",
    }),
    ingestSchema: builder.mutation<Record<string, unknown>, void>({
      query: () => ({ url: "/schema/ingest", method: "POST" }),
    }),
  }),
});

export const {
  useRunQueryMutation,
  useGetHealthQuery,
  useGetSchemaStatsQuery,
  useIngestSchemaMutation,
} = api;
