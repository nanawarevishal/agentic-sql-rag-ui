import { useAppSelector } from "../store/hooks";
import { DEFAULT_SETTINGS } from "../store/settingsSlice";
import { useChat } from "../hooks/useChat";
import { useChartFocus } from "../hooks/useChartFocus";
import { QueryForm } from "../components/QueryForm";
import { ChatTurnView } from "../components/ChatTurnView";
import { ChartFocusPanel } from "../components/ChartFocusPanel";
import { ConversationSidebar } from "../features/conversations/ConversationSidebar";
import { useLazyGetConversationMessagesQuery, type Conversation } from "../features/conversations/conversationsApi";
import { ProjectSelect } from "../features/projects/ProjectSelect";
import { useGetProjectsQuery } from "../features/projects/projectsApi";

export function ChatPage() {
  const settings = useAppSelector((state) => state.settings);
  const { turns, ask, conversationId, projectId, setProjectId, startNewConversation, loadConversation } =
    useChat();
  const { focused } = useChartFocus();
  const [fetchConversationMessages] = useLazyGetConversationMessagesQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const activeProject = projects.find((p) => p.id === projectId);
  const isDocProject = activeProject?.type === "doc_rag";
  const composerPlaceholder =
    isDocProject
      ? `Ask a question about ${activeProject?.name}...`
      : "Ask a question about the database...";

  const handleSubmit = (question: string) => {
    ask({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
      enable_out_of_scope_filter: settings.enableOutOfScopeFilter,
      enable_static_sql_validation: settings.enableStaticSqlValidation,
      // Sent only when the user has moved them off the default. These two are
      // deployment settings on the doc service, so always sending them would
      // let this UI's defaults quietly override a server configured
      // otherwise - the backend distinguishes "unset" from "explicitly off".
      ...(isDocProject && settings.enableHybridSearch !== DEFAULT_SETTINGS.enableHybridSearch
        ? { enable_hybrid_search: settings.enableHybridSearch }
        : {}),
      ...(isDocProject && settings.enableReranking !== DEFAULT_SETTINGS.enableReranking
        ? { enable_reranking: settings.enableReranking }
        : {}),
    });
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    const messages = await fetchConversationMessages(conversation.id).unwrap();
    loadConversation(conversation.id, conversation.project_id, messages);
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
            <ProjectSelect
              value={projectId}
              onChange={setProjectId}
              disabled={conversationId !== null}
            />
            <QueryForm
              onSubmit={handleSubmit}
              pending={pending}
              placeholder={composerPlaceholder}
              projectType={activeProject?.type}
            />
          </div>
        </div>
      </div>

      <ChartFocusPanel />
    </div>
  );
}
