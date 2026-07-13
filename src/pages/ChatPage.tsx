import { useAppSelector } from "../store/hooks";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { useChartFocus } from "../hooks/useChartFocus";
import { QueryForm } from "../components/QueryForm";
import { ChatTurnView } from "../components/ChatTurnView";
import { ChartFocusPanel } from "../components/ChartFocusPanel";
import { ChartFocusProvider } from "../components/ChartFocusProvider";
import { ConversationSidebar } from "../features/conversations/ConversationSidebar";
import { useLazyGetConversationMessagesQuery, type Conversation } from "../features/conversations/conversationsApi";

export function ChatPage() {
  return (
    <ChartFocusProvider>
      <ChatPageContent />
    </ChartFocusProvider>
  );
}

function ChatPageContent() {
  const settings = useAppSelector((state) => state.settings);
  const { turns, ask, conversationId, startNewConversation, loadConversation } = useStreamingChat();
  const { focused } = useChartFocus();
  const [fetchConversationMessages] = useLazyGetConversationMessagesQuery();

  const handleSubmit = (question: string) => {
    ask({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
    });
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    const messages = await fetchConversationMessages(conversation.id).unwrap();
    loadConversation(conversation.id, messages);
  };

  const handleConversationDeleted = (deletedId: string) => {
    if (deletedId === conversationId) startNewConversation();
  };

  const pending = turns.length > 0 && turns[turns.length - 1].isStreaming;

  return (
    <div className={`chat-page ${focused ? "has-focus-panel" : ""}`}>
      <ConversationSidebar
        activeConversationId={conversationId}
        onSelect={handleSelectConversation}
        onNewChat={startNewConversation}
        onDeleted={handleConversationDeleted}
      />

      <div className="chat-column">
        <div className="chat-scroll">
          {turns.length === 0 && (
            <div className="chat-hero">
              <span className="chat-hero-eyebrow">Text-to-SQL agent</span>
              <h1>Ask your database anything</h1>
              <p>
                Natural-language questions, decomposed and answered over your live schema —
                with every reasoning step traced.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <ChatTurnView key={turn.id} turn={turn} />
          ))}
        </div>

        <div className="chat-composer-dock">
          <div className="chat-composer-dock-inner">
            <QueryForm onSubmit={handleSubmit} pending={pending} />
          </div>
        </div>
      </div>

      <ChartFocusPanel />
    </div>
  );
}
