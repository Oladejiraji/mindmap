import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";

export type Thread = Doc<"threads">;

export function useThreads() {
  return useQuery({
    ...convexQuery(api.threads.list, {}),
  });
}

export function useThread(threadId: Id<"threads">) {
  return useQuery({
    ...convexQuery(api.threads.get, { threadId }),
  });
}
