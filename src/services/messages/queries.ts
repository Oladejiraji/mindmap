import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";

import { useNodesByThread, type Node } from "@/services/nodes/queries";

export type Message = Doc<"messages">;

export type ChatItem =
  | { kind: "message"; message: Message }
  | { kind: "branch-marker"; id: string; fromTitle: string; intoTitle: string };

export function useMessagesByNode(nodeId: Id<"nodes">) {
  return useQuery({
    ...convexQuery(api.messages.listByNode, { nodeId }),
  });
}

export function useNodeContextMessages(
  threadId: Id<"threads">,
  nodeId: Id<"nodes">,
) {
  const { data: allNodes, isLoading: nodesLoading } = useNodesByThread(threadId);

  const chain = useMemo<Node[] | null>(() => {
    if (!allNodes) return null;
    const byId = new Map(allNodes.map((n) => [n._id, n]));
    const result: Node[] = [];
    let current = byId.get(nodeId);
    while (current) {
      result.unshift(current);
      if (!current.parentId) break;
      current = byId.get(current.parentId);
    }
    return result;
  }, [allNodes, nodeId]);

  const queries = useQueries({
    queries: (chain ?? []).map((node) => ({
      ...convexQuery(api.messages.listByNode, { nodeId: node._id }),
    })),
  });

  const messagesLoaded =
    chain !== null &&
    chain.length > 0 &&
    queries.every((q) => q.data !== undefined);

  const items = useMemo<ChatItem[]>(() => {
    if (!chain || !messagesLoaded) return [];
    const result: ChatItem[] = [];
    for (let i = 0; i < chain.length; i++) {
      const node = chain[i];
      const msgs = (queries[i].data ?? []) as Message[];
      const isTarget = i === chain.length - 1;
      const sliceLimit = isTarget ? msgs.length : (chain[i + 1].branchedAt ?? 0);
      const sliced = msgs.slice(0, sliceLimit);

      if (i > 0) {
        result.push({
          kind: "branch-marker",
          id: `branch-${node._id}`,
          fromTitle: chain[i - 1].title,
          intoTitle: node.title,
        });
      }
      for (const m of sliced) {
        result.push({ kind: "message", message: m });
      }
    }
    return result;
  }, [chain, queries, messagesLoaded]);

  const targetMessages =
    chain && messagesLoaded
      ? ((queries[queries.length - 1].data ?? []) as Message[])
      : [];

  return {
    items,
    targetMessages,
    isLoading: nodesLoading || !messagesLoaded,
  };
}
