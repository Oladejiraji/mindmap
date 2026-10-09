"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { MessageSquare, X } from "lucide-react";
import type { Block } from "@blocknote/core";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useNode } from "@/services/nodes/queries";
import { handleError } from "@/lib/handle-error";
import { BlockEditor } from "./block-editor";
import { NodeChat } from "@/components/chat/node-chat";
import { cn } from "@/lib/utils";

export function NodeEditorView({
  threadId,
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
}) {
  const { data: node, isPending } = useNode(nodeId);
  const updateContent = useMutation(api.nodes.updateContent);
  const [chatOpen, setChatOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const hasContent =
    node?.content &&
    Array.isArray(node.content) &&
    node.content.length > 0 &&
    !(
      node.content.length === 1 &&
      node.content[0].type === "paragraph" &&
      (!node.content[0].content || node.content[0].content.length === 0)
    );

  const shouldDefaultChatOpen = node && !hasContent;

  const [chatInitialized, setChatInitialized] = useState(false);
  if (!chatInitialized && node) {
    setChatOpen(!!shouldDefaultChatOpen);
    setChatInitialized(true);
  }

  const handleContentChange = useCallback(
    (blocks: Block[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateContent({ nodeId, content: blocks }).catch((err) =>
          handleError(err, "Failed to save content"),
        );
      }, 500);
    },
    [nodeId, updateContent],
  );

  if (isPending) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] items-center justify-center">
        <p className="text-sm text-muted-foreground">Node not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)]">
      <div className={cn("flex-1 min-w-0 overflow-y-auto", chatOpen && "border-r border-border/40")}>
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="mb-6 text-xl font-semibold text-foreground">
            {node.title}
          </h1>
          <BlockEditor
            initialContent={
              Array.isArray(node.content) ? (node.content as Block[]) : undefined
            }
            onChange={handleContentChange}
          />
        </div>
      </div>

      {chatOpen && (
        <div className="w-[400px] shrink-0 flex flex-col">
          <div className="flex h-10 items-center justify-between border-b border-border/40 px-3">
            <span className="text-xs font-medium text-foreground/60">Chat</span>
            <button
              onClick={() => setChatOpen(false)}
              className="flex size-6 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground/60"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <NodeChat threadId={threadId} nodeId={nodeId} />
          </div>
        </div>
      )}

      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105"
        >
          <MessageSquare className="size-4" />
        </button>
      )}
    </div>
  );
}
