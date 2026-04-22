import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

export type Thread = Doc<"threads">;

export function useThreads() {
  return useAuthedConvexQuery(api.threads.list, {});
}

export function useThread(threadId: Id<"threads">) {
  return useAuthedConvexQuery(api.threads.get, { threadId });
}
