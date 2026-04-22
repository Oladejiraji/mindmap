import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

export type Node = Doc<"nodes">;

export function useNodesByThread(threadId: Id<"threads">) {
  return useAuthedConvexQuery(api.nodes.listByThread, { threadId });
}

export function useNode(nodeId: Id<"nodes">) {
  return useAuthedConvexQuery(api.nodes.get, { nodeId });
}
