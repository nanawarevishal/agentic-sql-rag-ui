// Mirrors app/api/routers/query.py (QueryRequest/QueryResponse) and
// app/agent/state.py (TraceEvent) on the backend.

export interface QueryRequest {
  question: string;
  enable_out_of_scope_filter?: boolean;
  enable_decomposition?: boolean;
  enable_crag_grading?: boolean;
  enable_self_rag_critique?: boolean;
  enable_static_sql_validation?: boolean;
  stream?: boolean;
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

// One line of the "stream": true NDJSON response body (POST /query).
// Discriminated by `type` - trace lines arrive as each graph node
// finishes, sub_result lines as each sub-question resolves, and a single
// final line closes out the stream with the same shape POST /query
// (stream: false) returns in one shot.
export type StreamLine =
  | ({ type: "trace" } & TraceEvent)
  | { type: "sub_result"; result: SubQuestionResult }
  | { type: "final"; question: string; final_answer: string | null; sub_results: SubQuestionResult[] };

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
