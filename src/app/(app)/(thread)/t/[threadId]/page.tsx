"use client";

import { Suspense, use } from "react";
import type { Id } from "@convex/dataModel";
import { ThreadCanvas } from "@/components/canvas/thread-canvas";
import { useThread } from "@/services/threads/queries";
import { useRegisterTab } from "@/lib/tabs";
import { routes } from "@/lib/routes";

export default function CanvasPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const { data: thread } = useThread(threadId as Id<"threads">);
  useRegisterTab(thread ? { href: routes.thread(threadId), kind: "project", title: thread.name } : null);

  // ThreadCanvas reads ?view= / ?node=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <ThreadCanvas threadId={threadId as Id<"threads">} />
    </Suspense>
  );
}
