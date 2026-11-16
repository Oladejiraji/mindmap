"use client";

import type { Doc } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { markdownToPlainText } from "@/lib/markdown";
import { formatRelativeTime } from "@/lib/format-time";

/*
 * Body of a tab's hover preview (define.app): the title with when it was
 * last active, then a two-line snippet. For a project the snippet is the
 * root node's notes, falling back to how many nodes it has. Rendered only
 * while the preview is open, so the node query runs on hover.
 */
export function TabPreview({ thread }: { thread: Doc<"threads"> }) {
  const { data: nodes } = useAuthedConvexQuery(api.nodes.listByThread, { threadId: thread._id });
  const root = nodes?.find((n) => n.parentId === null);
  const notes = markdownToPlainText(root?.content);
  const snippet = notes || (nodes ? `${nodes.length} ${nodes.length === 1 ? "node" : "nodes"}, no notes yet.` : "Loading…");

  return (
    <div className="w-80 p-4">
      <div className="flex items-baseline gap-3">
        <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg-primary">{thread.name || "Untitled"}</p>
        <span className="shrink-0 text-caption-lg text-fg-tertiary">
          {formatRelativeTime(thread.updatedAt ?? thread._creationTime)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-body-sm text-fg-tertiary">{snippet}</p>
    </div>
  );
}
