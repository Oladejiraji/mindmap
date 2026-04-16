import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";

export type Message = Doc<"messages">;

export function useMessagesByNode(nodeId: Id<"nodes">) {
  return useQuery({
    ...convexQuery(api.messages.listByNode, { nodeId }),
  });
}
