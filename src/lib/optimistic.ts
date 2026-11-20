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

/** Takes the tab out of the strip right away. */
export function closeTabOptimistic(localStore: OptimisticLocalStore, args: { threadId: Id<"threads"> }) {
  const open = localStore.getQuery(api.tabs.list, {});
  if (open) localStore.setQuery(api.tabs.list, {}, open.filter((t) => t.thread._id !== args.threadId));
}

/** Same ordering as the server: listed tabs first, the rest after in their old order. */
export function reorderTabsOptimistic(localStore: OptimisticLocalStore, args: { threadIds: Id<"threads">[] }) {
  const open = localStore.getQuery(api.tabs.list, {});
  if (!open) return;
  const rank = new Map(args.threadIds.map((id, i) => [id as string, i]));
  const at = (t: (typeof open)[number], i: number) => rank.get(t.thread._id) ?? args.threadIds.length + i;
  localStore.setQuery(
    api.tabs.list,
    {},
    open
      .map((t, i) => [at(t, i), t] as const)
      .sort(([a], [b]) => a - b)
      .map(([, t]) => t),
  );
}

/** Same as the server: the tab lands between the other pinned tabs and the rest. */
export function togglePinOptimistic(localStore: OptimisticLocalStore, args: { threadId: Id<"threads"> }) {
  const open = localStore.getQuery(api.tabs.list, {});
  const tab = open?.find((t) => t.thread._id === args.threadId);
  if (!open || !tab) return;
  const others = open.filter((t) => t !== tab);
  localStore.setQuery(api.tabs.list, {}, [
    ...others.filter((t) => t.pinned),
    { ...tab, pinned: !tab.pinned },
    ...others.filter((t) => !t.pinned),
  ]);
}
