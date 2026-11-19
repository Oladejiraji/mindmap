"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConvex, useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { closeTabOptimistic, reorderTabsOptimistic } from "@/lib/optimistic";
import { routes } from "@/lib/routes";
import { tabHref } from "./tab-href";
import type { OpenTabs } from "./tab-strip";

/*
 * Closing tabs, shared by the strip and the phone's switcher. Tabs closed
 * this session are remembered (newest last) for reopening: ⌥⇧T, Undo and
 * the switcher's "Recently closed".
 */

type ClosedTab = OpenTabs[number];
let closed: ClosedTab[] = [];
const listeners = new Set<() => void>();
function setClosed(next: ClosedTab[]) {
  closed = next.slice(-20);
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const forget = (id: string) => closed.filter((t) => t.thread._id !== id);

/** Tabs closed this session, newest last. */
export function useClosedTabs(): readonly ClosedTab[] {
  return useSyncExternalStore(subscribe, () => closed, () => closed);
}

export function useCloseTab(tabs: OpenTabs | undefined) {
  const pathname = usePathname();
  const router = useRouter();
  const convex = useConvex();
  const closeTab = useMutation(api.tabs.close).withOptimisticUpdate(closeTabOptimistic);
  const openTab = useMutation(api.tabs.open);
  const reorderTabs = useMutation(api.tabs.reorder).withOptimisticUpdate(reorderTabsOptimistic);
  const list = tabs ?? [];

  /** Closes a tab. Closing the one you're on goes to the next tab (or the previous one at the end), like a browser; with none left, Home. */
  const close = async (threadId: Id<"threads">) => {
    const i = list.findIndex((t) => t.thread._id === threadId);
    const tab = list[i];
    if (!tab) return;
    setClosed([...forget(threadId), tab]);
    if (pathname === routes.thread(threadId)) {
      const next = list[i + 1] ?? list[i - 1];
      router.push(next ? tabHref(next) : routes.home);
    }
    try {
      await closeTab({ threadId });
    } catch (err) {
      handleError(err, "Couldn't close the tab");
    }
  };

  /**
   * Puts a just-closed tab back where it was, without going to it. `order`
   * is the tab order from before it closed.
   */
  const restore = (tab: ClosedTab, order: Id<"threads">[]) => {
    setClosed(forget(tab.thread._id));
    const at = order.indexOf(tab.thread._id);
    openTab
      .withOptimisticUpdate((store) => {
        const open = store.getQuery(api.tabs.list, {});
        if (!open || open.some((t) => t.thread._id === tab.thread._id)) return;
        store.setQuery(api.tabs.list, {}, [...open.slice(0, at), tab, ...open.slice(at)]);
      })({ threadId: tab.thread._id })
      .catch((err) => handleError(err, "Couldn't reopen the tab"));
    // The server adds it at the end; this puts it back in its place.
    reorderTabs({ threadIds: order }).catch(() => {});
  };

  /** Reopens the most recently closed tab that isn't open again and whose project still exists. Visiting it opens its tab. */
  const reopenLast = async () => {
    while (closed.length) {
      const tab = closed.at(-1)!;
      setClosed(closed.slice(0, -1));
      if (list.some((t) => t.thread._id === tab.thread._id)) continue;
      // Fails if the project was deleted since; then try the next one.
      const search = await convex.query(api.projectViews.get, { threadId: tab.thread._id }).catch(() => null);
      if (search !== null) return router.push(tabHref({ ...tab, search }));
    }
  };

  return { close, restore, reopenLast };
}
