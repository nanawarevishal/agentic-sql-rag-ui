// Mirrors app/api/routers/admin.py on the backend.
import { api } from "../../api/apiSlice";

export interface TopQuestion {
  question: string;
  count: number;
}

export interface UserActivity {
  user_id: string;
  email: string;
  query_count: number;
  error_count: number;
}

export interface UsageSummary {
  total_queries: number;
  error_count: number;
  error_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  top_questions: TopQuestion[];
  per_user: UserActivity[];
}

const adminUsageApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMetricsSummary: builder.query<UsageSummary, { sinceDays?: number } | void>({
      query: (arg) => `/admin/metrics/summary?since_days=${arg?.sinceDays ?? 7}`,
    }),
  }),
});

export const { useGetMetricsSummaryQuery } = adminUsageApi;
