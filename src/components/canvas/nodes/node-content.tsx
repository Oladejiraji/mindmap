"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InlineNodeEditor } from "./inline-node-editor";

/** A node's document on its canvas card: a markdown preview that turns into an editor on click. */
export function NodeContent({
  nodeId,
  content,
  editorTheme = "light",
}: {
  nodeId?: string;
  /** Markdown. */
  content?: string;
  editorTheme?: "light" | "dark";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const markdown = content?.trim() ?? "";

  if (nodeId && isEditing) {
    return (
      <div className="p-2">
        <InlineNodeEditor
          nodeId={nodeId}
          markdown={markdown}
          onBlur={() => setIsEditing(false)}
          theme={editorTheme}
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
        <p
          className="text-caption-lg opacity-50"
          style={{ lineHeight: 1.5, color: editorTheme === "dark" ? "white" : undefined }}
        >
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
