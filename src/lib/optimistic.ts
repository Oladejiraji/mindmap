import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";
import type { OptimisticLocalStore } from "convex/browser";

/*
 * Optimistic updates: local changes applied the moment a mutation is sent,
 * so the UI doesn't wait for the server. Use with
 * `useMutation(api.x.y).withOptimisticUpdate(update)`.
 */

/** Shows a project's new name everywhere right away. */
export function renameThreadOptimistic(
  localStore: OptimisticLocalStore,
  args: { threadId: Id<"threads">; name: string },
) {
  const thread = localStore.getQuery(api.threads.get, { threadId: args.threadId }) as Doc<"threads"> | null | undefined;
  if (thread) {
    localStore.setQuery(api.threads.get, { threadId: args.threadId }, { ...thread, name: args.name });
  }
  const threads = localStore.getQuery(api.threads.list, {}) as Doc<"threads">[] | undefined;
  if (threads) {
    localStore.setQuery(
      api.threads.list,
      {},
      threads.map((t) => (t._id === args.threadId ? { ...t, name: args.name } : t)),
    );
  }
  const tabs = localStore.getQuery(api.tabs.list, {});
  if (tabs) {
    localStore.setQuery(
      api.tabs.list,
      {},
      tabs.map((t) => (t.thread._id === args.threadId ? { ...t, thread: { ...t.thread, name: args.name } } : t)),
    );
  }
}
