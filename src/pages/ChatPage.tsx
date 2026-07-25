import { useAppSelector } from "../store/hooks";
import { useChat } from "../hooks/useChat";
import { useChartFocus } from "../hooks/useChartFocus";
import { QueryForm } from "../components/QueryForm";
import { ChatTurnView } from "../components/ChatTurnView";
import { ChartFocusPanel } from "../components/ChartFocusPanel";
import { ConversationSidebar } from "../features/conversations/ConversationSidebar";
import { useLazyGetConversationMessagesQuery, type Conversation } from "../features/conversations/conversationsApi";
import { DataSourceSelect } from "../features/datasources/DataSourceSelect";

export function ChatPage() {
  const settings = useAppSelector((state) => state.settings);
  const { turns, ask, conversationId, dataSourceId, setDataSourceId, startNewConversation, loadConversation } =
    useChat();
  const { focused } = useChartFocus();
  const [fetchConversationMessages] = useLazyGetConversationMessagesQuery();

  const handleSubmit = (question: string) => {
    ask({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
      enable_out_of_scope_filter: settings.enableOutOfScopeFilter,
      enable_static_sql_validation: settings.enableStaticSqlValidation,
    });
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    const messages = await fetchConversationMessages(conversation.id).unwrap();
    loadConversation(conversation.id, conversation.data_source_id, messages);
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
              <span className="chat-hero-eyebrow">Data assistant</span>
              <h1>Ask your data anything</h1>
              <p>
                Ask in plain English. Every answer comes back with the numbers behind it and
                the steps taken to get there.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <ChatTurnView key={turn.id} turn={turn} />
          ))}
        </div>

        <div className="chat-composer-dock">
          <div className="chat-composer-dock-inner">
            <DataSourceSelect
              value={dataSourceId}
              onChange={setDataSourceId}
              disabled={conversationId !== null}
            />
            <QueryForm onSubmit={handleSubmit} pending={pending} />
          </div>
        </div>
      </div>

      <ChartFocusPanel />
    </div>
  );
}
