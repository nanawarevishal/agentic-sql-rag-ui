// Mirrors app/api/routers/query.py (QueryRequest/QueryResponse) and
// app/agent/state.py (TraceEvent) on the backend.

export interface QueryRequest {
  question: string;
  // Omit to start a new conversation; pass a prior response's
  // conversation_id to append this turn to it.
  conversation_id?: string | null;
  // Which Project (see src/features/projects/projectsApi.ts) to query.
  // Omit to use the builtin one. Only honored when starting a new
  // conversation - an existing conversation always keeps querying whatever
  // project it was created against.
  project_id?: string | null;
  enable_out_of_scope_filter?: boolean;
  enable_decomposition?: boolean;
  enable_crag_grading?: boolean;
  enable_self_rag_critique?: boolean;
  enable_static_sql_validation?: boolean;
  // Document projects only. Omitted rather than false when the user hasn't
  // changed them, so the doc service keeps its configured default.
  enable_hybrid_search?: boolean;
  enable_reranking?: boolean;
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

// One grounded excerpt behind a document answer. Present on doc_rag
// sub-results the same way `rows` is present on sql_rag ones.
//
// `modality` and `asset_url` are part of the shape from day one, including
// on plain text passages where asset_url is null - so a component that
// switches on modality keeps working unchanged when image passages start
// arriving (see agentic-doc-rag's README on the multimodal staging).
export type PassageModality = "text" | "table" | "image";

export interface Passage {
  chunk_id: string;
  document: string;
  document_id?: string;
  page?: number | null;
  pages?: number[];
  headings?: string[];
  modality: PassageModality;
  text: string;
  score?: number;
  // Served through the backend gateway, not a raw storage URL, so it stays
  // behind the same auth as everything else.
  asset_url?: string | null;
}

// One resolved `[n]` marker in the final answer.
//
// This - NOT the order passages happen to appear in sub_results - is the
// numbering the prose uses. The document service resolves markers twice
// (agentic-doc-rag's app/rag/citations.py): once per sub-question, then
// again across the merged answer, where it drops passages nothing cites,
// collapses a chunk cited by two sub-questions into one number, and
// renumbers what survives 1..n. So a Sources list built by indexing
// passages disagrees with the answer as soon as anything is retrieved but
// not cited.
//
// Deliberately no `text`: the excerpt body stays on the passage in
// sub_results (joined by chunk_id) so the wire doesn't carry it twice.
export interface Citation {
  marker: number;
  chunk_id: string;
  document: string;
  document_id?: string;
  page?: number | null;
  pages?: number[];
  headings?: string[];
  modality: PassageModality;
  asset_url?: string | null;
  score?: number;
}

// A sub-question's result. The two agents fill in different halves: the SQL
// agent returns `sql` + `rows`, the document agent returns `passages` +
// `answer`. Everything else - retries, accepted, the clarification fields -
// is shared, which is what lets one component tree render both.
export interface SubQuestionResult {
  sub_question?: string;
  sql?: string;
  retries?: number;
  rows?: Array<Record<string, unknown>>;
  passages?: Passage[];
  answer?: string | null;
  error?: string | null;
  accepted?: boolean;
  // Document sub-results only. `faithfulness` is the share of the answer the
  // excerpts actually support, and `weakly_grounded` is that score already
  // judged against the service's FAITHFULNESS_THRESHOLD. Read the flag, not
  // the score: the threshold is tunable config in the document service, and
  // comparing against a copy of the number here silently keeps warning by
  // whatever value was current when this was written. Because a draft below
  // the threshold is retried, the flag is only true when the retry budget
  // ran out.
  //
  // Absent means UNKNOWN, not "grounded": a SQL sub-result, or a doc turn
  // stored before the service sent the flag. No warning renders either way,
  // so a reloaded old turn can't show one - see GroundingWarning.
  source_confidence?: number | null;
  faithfulness?: number | null;
  weakly_grounded?: boolean;
  [key: string]: unknown;
}

// How a turn resolved, independent of final_answer's prose. "answered" =
// final_answer is the answer; "needs_clarification" = it's a question back
// to the user (reply on the same conversation_id); "declined" = the agent
// can't answer at all and no reply changes that.
export type Resolution = "answered" | "needs_clarification" | "declined";

export interface QueryResponse {
  question: string;
  conversation_id: string;
  final_answer: string | null;
  resolution: Resolution;
  // grade_relevance verdicts behind a non-"answered" resolution
  // ("ambiguous" / "future_scope" / "insufficient"). Empty when answered.
  resolution_verdicts: string[];
  // True when the synthesize LLM call hit its token cap - the prose answer
  // may be cut off mid-sentence even though sub_results' row data is complete.
  answer_truncated: boolean;
  // Plain-language "why this answer" explanation, generated by synthesize
  // from the same facts as final_answer - deliberately free of SQL/DB
  // jargon. Null if that best-effort call failed; the rest of the response
  // is unaffected either way.
  why_explanation: string | null;
  sub_results: SubQuestionResult[];
  // Absent on sql_rag turns, which have no marker numbering at all, and empty
  // on a document turn whose answer used no markers. The difference decides
  // whether a Sources list may fall back to passage order - see CitationList.
  citations?: Citation[];
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
  | {
      type: "final";
      question: string;
      conversation_id: string;
      final_answer: string | null;
      resolution: Resolution;
      resolution_verdicts: string[];
      answer_truncated: boolean;
      why_explanation: string | null;
      sub_results: SubQuestionResult[];
      // Optional on the wire: only the document service sends it, and the
      // gateway forwards the final line as-is.
      citations?: Citation[];
    }
  | { type: "error"; message?: string; detail?: unknown };

// FastAPI's error body shape varies by failure kind: a plain string, a list
// of pydantic validation errors (422), or this backend's custom
// {error, message, details, type} shape (500s from app/api routers).
export type ApiErrorBody =
  | { detail: string }
  | { detail: Array<{ msg?: string; [key: string]: unknown }> }
  | { detail: { message?: string; error?: string; [key: string]: unknown } };

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  configuration: Record<string, boolean>;
  cache: Record<string, unknown>;
}

