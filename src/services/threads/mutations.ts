import { api } from "@convex/api";
import type { Doc, Id } from "@convex/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { useMutation } from "convex/react";

const renameOptimisticUpdate = (
  localStore: OptimisticLocalStore,
  args: { threadId: Id<"threads">; name: string },
) => {
  const thread = localStore.getQuery(api.threads.get, { threadId: args.threadId }) as Doc<"threads"> | null | undefined;
  if (thread) {
    localStore.setQuery(api.threads.get, { threadId: args.threadId }, { ...thread, name: args.name });
  }
  const threads = localStore.getQuery(api.threads.list, {}) as Doc<"threads">[] | undefined;
  if (threads) {
    localStore.setQuery(api.threads.list, {}, threads.map((t) =>
      t._id === args.threadId ? { ...t, name: args.name } : t,
    ));
  }
};

export function useRenameThread() {
  return useMutation(api.threads.rename).withOptimisticUpdate(renameOptimisticUpdate);
}
