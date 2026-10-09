"use client";

import { use } from "react";
import type { Id } from "@convex/dataModel";
import { NodeEditorView } from "@/components/editor/node-editor-view";

export default function NodePage({
  params,
}: {
  params: Promise<{ threadId: string; nodeId: string }>;
}) {
  const { threadId, nodeId } = use(params);

  return (
    <NodeEditorView
      threadId={threadId as Id<"threads">}
      nodeId={nodeId as Id<"nodes">}
    />
  );
}
