import { useAppSelector } from "../store/hooks";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { useChartFocus } from "../hooks/useChartFocus";
import { QueryForm } from "../components/QueryForm";
import { ChatTurnView } from "../components/ChatTurnView";
import { ChartFocusPanel } from "../components/ChartFocusPanel";
import { ChartFocusProvider } from "../components/ChartFocusProvider";

export function ChatPage() {
  return (
    <ChartFocusProvider>
      <ChatPageContent />
    </ChartFocusProvider>
  );
}

function ChatPageContent() {
  const settings = useAppSelector((state) => state.settings);
  const { turns, ask } = useStreamingChat();
  const { focused } = useChartFocus();

  const handleSubmit = (question: string) => {
    ask({
      question,
      enable_decomposition: settings.enableDecomposition,
      enable_crag_grading: settings.enableCragGrading,
      enable_self_rag_critique: settings.enableSelfRagCritique,
    });
  };

  const pending = turns.length > 0 && turns[turns.length - 1].isStreaming;

  return (
    <div className={`chat-page ${focused ? "has-focus-panel" : ""}`}>
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

      <ChartFocusPanel />
    </div>
  );
}
