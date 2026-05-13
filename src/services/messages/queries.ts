import { useMemo } from "react";
import type { Doc, Id } from "@convex/dataModel";

import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { api } from "@convex/api";

export type Message = Doc<"messages">;

export type ChatItem =
  | { kind: "message"; message: Message }
  | { kind: "branch-marker"; id: string; fromTitle: string; intoTitle: string };

export function useMessagesByNode(nodeId: Id<"nodes">) {
  return useAuthedConvexQuery(api.messages.listByNode, { nodeId });
}

export function useNodeContextMessages(
  threadId: Id<"threads">,
  nodeId: Id<"nodes">,
) {
  const {
    data: messages,
    isLoading,
    error,
    refetch,
  } = useMessagesByNode(nodeId);

  const items = useMemo<ChatItem[]>(() => {
    if (!messages) return [];
    return messages.map((m) => ({ kind: "message" as const, message: m }));
  }, [messages]);

  return {
    items,
    targetMessages: messages ?? [],
    isLoading,
    error,
    retry: () => {
      if (error) void refetch();
    },
  };
}
