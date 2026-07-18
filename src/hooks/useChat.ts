import { useContext } from "react";
import { ChatContext } from "../context/ChatContext";

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
