"use client";

import { Suspense, use } from "react";
import type { Id } from "@convex/dataModel";
import { NodeEditorView } from "@/components/editor/node-editor-view";

export default function NodePage({
  params,
}: {
  params: Promise<{ threadId: string; nodeId: string }>;
}) {
  const { threadId, nodeId } = use(params);

  // NodeEditorView reads ?tab=, so it needs a Suspense boundary.
  return (
    <Suspense>
      <NodeEditorView
        threadId={threadId as Id<"threads">}
        nodeId={nodeId as Id<"nodes">}
      />
    </Suspense>
  );
}
