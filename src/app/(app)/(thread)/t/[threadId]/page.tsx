"use client";

import { Suspense, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { ThreadCanvas } from "@/components/canvas/thread-canvas";

export default function CanvasPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId: id } = use(params);
  const threadId = id as Id<"threads">;
  const openTab = useMutation(api.tabs.open);

  // However you got here (Home, a link, search), the project you're
  // looking at has a tab. Shown at once from the cached project list so
  // the strip doesn't shift when the server answers.
  useEffect(() => {
    openTab
      .withOptimisticUpdate((store) => {
        const tabs = store.getQuery(api.tabs.list, {});
        if (!tabs || tabs.some((t) => t.thread._id === threadId)) return;
        const thread = store.getQuery(api.threads.list, {})?.find((t) => t._id === threadId);
        if (!thread) return;
        store.setQuery(api.tabs.list, {}, [
          ...tabs,
          { _id: `pending-${threadId}` as Id<"tabs">, pinned: false, thread, search: "" },
        ]);
      })({ threadId })
      // Not your project or gone: the canvas shows that, no tab needed.
      .catch(() => {});
  }, [openTab, threadId]);

  // Both read the query string, so they need a Suspense boundary.
  return (
    <Suspense>
      <SaveProjectView threadId={threadId} />
      <ThreadCanvas threadId={threadId} />
    </Suspense>
  );
}

/**
 * Saves where you are in the project (the URL's query: view, panel,
 * full-screen chat) whenever it changes, so its tab, Home and a later visit
 * bring you back here. The tab's link updates at once.
 */
function SaveProjectView({ threadId }: { threadId: Id<"threads"> }) {
  const search = useSearchParams().toString();
  const save = useMutation(api.projectViews.save);
  // Syncs the URL (outside React state) to the server, once per change.
  useEffect(() => {
    save
      .withOptimisticUpdate((store) => {
        const tabs = store.getQuery(api.tabs.list, {});
        if (tabs) store.setQuery(api.tabs.list, {}, tabs.map((t) => (t.thread._id === threadId ? { ...t, search } : t)));
      })({ threadId, search })
      .catch(() => {});
  }, [save, threadId, search]);
  return null;
}
