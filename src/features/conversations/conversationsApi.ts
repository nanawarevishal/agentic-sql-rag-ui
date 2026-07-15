import { api } from "../../api/apiSlice";
import type { SubQuestionResult, TraceEvent } from "../../types";

export interface Conversation {
  id: string;
  title: string | null;
  data_source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  trace: TraceEvent[] | null;
  sub_results: SubQuestionResult[] | null;
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
