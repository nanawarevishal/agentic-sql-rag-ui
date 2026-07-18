import { createContext } from "react";
import type { useStreamingChat } from "../hooks/useStreamingChat";

export type ChatContextValue = ReturnType<typeof useStreamingChat>;

export const ChatContext = createContext<ChatContextValue | null>(null);
