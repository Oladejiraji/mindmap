"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { RenderIf } from "@/components/shared/render-if";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { isPreviewed, useEditPreview } from "@/lib/edit-preview";
import { cn } from "@/lib/utils";
import { NodeDocumentEditor } from "./node-document-editor";
import { DocumentReview } from "./document-review";
import { SuggestionBar } from "./suggestion-bar";

/**
 * A node's document, scrolling on its own: the editor, or, while a
 * suggested edit to it is previewed, the document with the edit marked
 * and a bar to answer it. The side panel's Content tab and the full-screen
 * chat's sheet.
 */
export function NodeDocumentPane({
  threadId,
  nodeId,
  markdown,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
  /** The saved document, live from the database. */
  markdown: string;
}) {
  const updateContent = useMutation(api.nodes.updateContent);
  const saveContent = useCallback(
    (content: string) => updateContent({ nodeId, content }),
    [nodeId, updateContent],
  );

  // Previewed by default; Preview buttons turn it off and on.
  const preview = useEditPreview();
  const { data: pending } = useAuthedConvexQuery(api.proposals.pendingByThread, { threadId });
  const suggestion = pending?.find((p) => p.nodeId === nodeId);
  const reviewBlocks =
    suggestion && isPreviewed(preview, suggestion.proposalId) ? suggestion.preview : undefined;

  return (
    <div data-document-scroll className="h-full overflow-y-auto overscroll-contain">
      {/* Floats at the top as the document scrolls. */}
      <div className="sticky top-0 z-10 px-3 pt-3 empty:hidden">
        <SuggestionBar nodeId={nodeId} />
      </div>
      {/* While previewing a suggested edit: the document with it marked.
          The editor stays mounted underneath, so its cursor and undo
          history survive. */}
      <RenderIf condition={!!reviewBlocks}>
        <div className="px-5 py-5">
          <DocumentReview blocks={reviewBlocks ?? []} proposalId={suggestion?.proposalId ?? ""} />
        </div>
      </RenderIf>
      <div className={cn("px-5 py-5", reviewBlocks && "hidden")}>
        <NodeDocumentEditor key={nodeId} markdown={markdown} onSave={saveContent} />
      </div>
    </div>
  );
}
