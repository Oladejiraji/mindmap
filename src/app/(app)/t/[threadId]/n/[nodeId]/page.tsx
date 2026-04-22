"use client";

import { use } from "react";
import type { Id } from "@convex/dataModel";
import { NodeChat } from "@/components/shared/chat/node-chat";

export default function ChatPage({
  params,
}: {
  params: Promise<{ threadId: string; nodeId: string }>;
}) {
  const { threadId, nodeId } = use(params);

  return (
    <NodeChat
      threadId={threadId as Id<"threads">}
      nodeId={nodeId as Id<"nodes">}
    />
  );
}
