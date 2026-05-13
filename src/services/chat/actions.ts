import { useAction } from "convex/react";
import { api } from "@convex/api";

export function useSendMessage() {
  return useAction(api.chat.sendMessage);
}
