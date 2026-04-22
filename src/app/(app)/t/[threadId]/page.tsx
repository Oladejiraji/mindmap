"use client";

import { use } from "react";
import type { Id } from "@convex/dataModel";
import { ThreadCanvas } from "@/components/shared/canvas/thread-canvas";

export default function CanvasPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);

  return <ThreadCanvas threadId={threadId as Id<"threads">} />;
}
