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
  cost_usd: number;
}

export interface UsageSummary {
  total_queries: number;
  error_count: number;
  error_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  total_cost_usd: number;
  avg_cost_per_query_usd: number;
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
