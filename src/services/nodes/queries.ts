import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";

export type Node = Doc<"nodes">;

export function useNodesByThread(threadId: Id<"threads">) {
  return useQuery({
    ...convexQuery(api.nodes.listByThread, { threadId }),
  });
}

export function useNode(nodeId: Id<"nodes">) {
  return useQuery({
    ...convexQuery(api.nodes.get, { nodeId }),
  });
}
