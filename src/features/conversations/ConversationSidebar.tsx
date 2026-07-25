import { useDeleteConversationMutation, useGetConversationsQuery, type Conversation } from "./conversationsApi";
import { usePendingDelete } from "../../hooks/usePendingDelete";
import { UndoToast } from "../../components/UndoToast";

interface Props {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onDeleted: (conversationId: string) => void;
}

function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export function ConversationSidebar({ activeConversationId, onSelect, onNewChat, onDeleted }: Props) {
  const { data: conversations = [], isLoading } = useGetConversationsQuery();
  const [deleteConversation] = useDeleteConversationMutation();
  // Deleting takes one click with no confirm dialog in the way; the undo
  // window is what makes that safe. onDeleted (which resets the open chat)
  // fires on commit, not on click, so an undo leaves the turn history alone.
  const { pending, schedule, undo } = usePendingDelete((id) => deleteConversation(id).unwrap(), {
    onCommitted: onDeleted,
    onFailed: () => alert("Failed to delete conversation. Please try again."),
  });

  const visible = conversations.filter((conversation) => conversation.id !== pending?.id);

  return (
    <aside className="conversation-sidebar">
      <button type="button" className="btn-primary conversation-sidebar-new" onClick={onNewChat}>
        + New chat
      </button>

      <div className="conversation-sidebar-list">
        {isLoading && <p className="conversation-sidebar-empty">Loading...</p>}
        {!isLoading && visible.length === 0 && (
          <p className="conversation-sidebar-empty">No conversations yet</p>
        )}
        {visible.map((conversation) => (
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
                schedule({
                  id: conversation.id,
                  label: conversation.title || "Untitled conversation",
                });
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
    </aside>
  );
}
