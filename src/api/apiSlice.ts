import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { HealthResponse } from "../types";
import type { RootState } from "../store/store";
import { clearCredentials, setCredentials, type SessionPayload } from "../features/auth/authSlice";

// Empty base URL: in dev, Vite's proxy (see vite.config.ts) forwards
// these paths to the FastAPI backend; in prod, serve the built frontend
// behind the same reverse proxy as the API so paths stay relative.
//
// /query isn't here: it's a streamed NDJSON body (see useStreamingChat),
// which fetchBaseQuery can't consume - it awaits response.json() on the
// whole body. useStreamingChat does its own fetch + reauth handling that
// mirrors the logic below.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

// credentials: "include" so the httpOnly refresh-token cookie
// (app/api/routers/auth.py) round-trips even when the API isn't
// same-origin with the frontend.
const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Dedupe concurrent 401s into a single POST /auth/refresh instead of one
// per failed request.
let refreshInFlight: ReturnType<typeof rawBaseQuery> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status === 401 && url !== "/auth/refresh") {
    refreshInFlight ??= rawBaseQuery({ url: "/auth/refresh", method: "POST" }, api, extraOptions);
    const refreshResult = await refreshInFlight;
    refreshInFlight = null;

    if (refreshResult.data) {
      api.dispatch(setCredentials(refreshResult.data as SessionPayload));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Conversations", "DataSources"],
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => "/health",
    }),
  }),
});

export const { useGetHealthQuery } = api;
