"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NodeContent({ content }: { content?: string }) {
  if (!content) {
    return (
      <p className="text-xs leading-tight opacity-50">No content yet</p>
    );
  }

  return (
    <div className="node-markdown">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
