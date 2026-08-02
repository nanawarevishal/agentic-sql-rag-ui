import { api } from "../../api/apiSlice";
import type { Citation, Resolution, SubQuestionResult, TraceEvent } from "../../types";

export interface Conversation {
  id: string;
  title: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  why_explanation: string | null;
  trace: TraceEvent[] | null;
  sub_results: SubQuestionResult[] | null;
  // Null on sql_rag turns and on document turns recorded before the backend
  // stored citations: no marker numbering exists, so passage order is the
  // only thing left to render. An empty ARRAY is different - the answer cited
  // nothing - and must not become a numbered Sources list. See CitationList.
  citations: Citation[] | null;
  // Persisted since the same migration. Null only on turns recorded before
  // it, which is why the reader treats null as "unknown" rather than
  // "answered" - see useStreamingChat's loadConversation.
  resolution: Resolution | null;
  resolution_verdicts: string[] | null;
  answer_truncated: boolean | null;
  created_at: string;
}

const conversationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => "/conversations",
      providesTags: ["Conversations"],
    }),
    getConversationMessages: builder.query<ConversationMessage[], string>({
      query: (conversationId) => `/conversations/${conversationId}/messages`,
    }),
    deleteConversation: builder.mutation<{ status: string }, string>({
      query: (conversationId) => ({ url: `/conversations/${conversationId}`, method: "DELETE" }),
      invalidatesTags: ["Conversations"],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useLazyGetConversationMessagesQuery,
  useDeleteConversationMutation,
} = conversationsApi;
