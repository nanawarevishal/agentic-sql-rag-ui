import { useDeleteConversationMutation, useGetConversationsQuery, type Conversation } from "./conversationsApi";

interface Props {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export function ConversationSidebar({ activeConversationId, onSelect, onNewChat }: Props) {
  const { data: conversations = [], isLoading } = useGetConversationsQuery();
  const [deleteConversation] = useDeleteConversationMutation();

  return (
    <aside className="conversation-sidebar">
      <button type="button" className="btn-primary conversation-sidebar-new" onClick={onNewChat}>
        + New chat
      </button>

      <div className="conversation-sidebar-list">
        {isLoading && <p className="conversation-sidebar-empty">Loading...</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="conversation-sidebar-empty">No conversations yet</p>
        )}
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-sidebar-item ${conversation.id === activeConversationId ? "active" : ""}`}
            onClick={() => onSelect(conversation)}
          >
            <span className="conversation-sidebar-item-title">
              {conversation.title || "Untitled conversation"}
            </span>
            <span className="conversation-sidebar-item-time">{formatRelativeTime(conversation.updated_at)}</span>
            <button
              type="button"
              className="conversation-sidebar-item-delete"
              title="Delete conversation"
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conversation.id);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
