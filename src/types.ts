// Mirrors app/api/routers/query.py (QueryRequest/QueryResponse) and
// app/agent/state.py (TraceEvent) on the backend.

export interface QueryRequest {
  question: string;
  enable_out_of_scope_filter?: boolean;
  enable_decomposition?: boolean;
  enable_crag_grading?: boolean;
  enable_self_rag_critique?: boolean;
  enable_static_sql_validation?: boolean;
}

export interface TraceEvent {
  step: number;
  node: string;
  summary: string;
  detail: Record<string, unknown>;
  timestamp: string;
  sub_question: string | null;
}

export interface SubQuestionResult {
  sub_question?: string;
  sql?: string;
  retries?: number;
  [key: string]: unknown;
}

export interface QueryResponse {
  question: string;
  final_answer: string | null;
  sub_results: SubQuestionResult[];
  trace: TraceEvent[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  configuration: Record<string, boolean>;
  cache: Record<string, unknown>;
}

export interface SchemaStatsResponse {
  status: string;
  stats: Record<string, unknown>;
}
