"use client";

import { useState, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Block } from "@blocknote/core";
import { blocksToMarkdown } from "@/lib/blocks-to-markdown";
import { InlineNodeEditor } from "./inline-node-editor";

export function NodeContent({
  nodeId,
  content,
}: {
  nodeId?: string;
  content?: unknown;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const markdown = useMemo(() => {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return blocksToMarkdown(content);
    return "";
  }, [content]);

  if (nodeId && isEditing) {
    return (
      <div className="p-2">
        <InlineNodeEditor
          nodeId={nodeId}
          initialContent={
            Array.isArray(content) ? (content as Block[]) : undefined
          }
          onBlur={() => setIsEditing(false)}
        />
      </div>
    );
  }

  if (!markdown) {
    return (
      <div
        className={nodeId ? "cursor-text p-2" : "p-2"}
        onClick={nodeId ? () => setIsEditing(true) : undefined}
      >
        <p className="text-xs opacity-50" style={{ lineHeight: 1.5 }}>
          {nodeId ? "Click to start writing…" : "No content yet"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={nodeId ? "node-markdown cursor-text p-2" : "node-markdown p-2"}
      onClick={nodeId ? () => setIsEditing(true) : undefined}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
