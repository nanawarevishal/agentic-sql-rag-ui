import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { HealthResponse, SchemaStatsResponse } from "../types";

// Empty base URL: in dev, Vite's proxy (see vite.config.ts) forwards
// these paths to the FastAPI backend; in prod, serve the built frontend
// behind the same reverse proxy as the API so paths stay relative.
//
// /query isn't here: it's a streamed NDJSON body (see useStreamingQuery),
// which fetchBaseQuery can't consume - it awaits response.json() on the
// whole body.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
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

export const { useGetHealthQuery, useGetSchemaStatsQuery, useIngestSchemaMutation } = api;
