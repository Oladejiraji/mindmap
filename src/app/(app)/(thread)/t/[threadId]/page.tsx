"use client";

import { Suspense, use } from "react";
import type { Id } from "@convex/dataModel";
import { ThreadCanvas } from "@/components/canvas/thread-canvas";

export default function CanvasPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  // ThreadCanvas reads ?view= / ?node=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <ThreadCanvas threadId={threadId as Id<"threads">} />
    </Suspense>
  );
}
