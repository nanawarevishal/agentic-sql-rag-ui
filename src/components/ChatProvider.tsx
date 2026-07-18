import type { ReactNode } from "react";
import { ChatContext } from "../context/ChatContext";
import { useStreamingChat } from "../hooks/useStreamingChat";

// Mounted once above the router outlet (see ProtectedRoute) rather than
// inside ChatPage, so an in-flight /query stream - and the turns already in
// the conversation - survive navigating to another page and back. Streaming
// state used to live in ChatPage's own component state, so switching to
// Data Sources or Usage mid-answer unmounted it and silently dropped the
// response; the backend finished and saved it, but the frontend had nothing
// pointing back at it.
export function ChatProvider({ children }: { children: ReactNode }) {
  const chat = useStreamingChat();
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}
