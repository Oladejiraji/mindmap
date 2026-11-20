"use client";

import { useState } from "react";
import type { Doc } from "@convex/dataModel";

/**
 * Tabs with a reply that finished while you were on another tab. Worked
 * out during render from each project's reply count; kept for this
 * session only. Opening the tab reads it.
 */
export function useUnreadTabs(tabs: { thread: Doc<"threads"> }[], activeId: string | undefined): ReadonlySet<string> {
  const replyingNow = tabs.filter((t) => (t.thread.replying ?? 0) > 0).map((t) => t.thread._id as string);
  const [wasReplying, setWasReplying] = useState<string[]>([]);
  const [unread, setUnread] = useState<ReadonlySet<string>>(new Set());
  if (replyingNow.join() !== wasReplying.join()) {
    const open = new Set(tabs.map((t) => t.thread._id as string));
    const finished = wasReplying.filter((id) => !replyingNow.includes(id) && id !== activeId && open.has(id));
    setWasReplying(replyingNow);
    if (finished.length) setUnread((prev) => new Set([...prev, ...finished]));
  }
  if (activeId && unread.has(activeId)) {
    setUnread((prev) => new Set([...prev].filter((id) => id !== activeId)));
  }
  return unread;
}
