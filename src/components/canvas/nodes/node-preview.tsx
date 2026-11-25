"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/api";
import { EditedBlock } from "@/components/shared/edit-markdown";
import { skippedEdits, useEditPreview } from "@/lib/edit-preview";

/** One block of a node's document after a suggested edit, marked with what happened to it. */
export type PreviewBlock = NonNullable<FunctionReturnType<typeof api.proposals.pendingByThread>[number]["preview"]>[number];

/**
 * Scrolls the node's content box (not the page or canvas) so the first
 * change shows: the box is short, and the change may be further down.
 * Outside the component, so it runs once, when the block mounts.
 */
function revealInBox(el: HTMLElement | null) {
  const box = el?.closest<HTMLElement>(".nowheel");
  if (!el || !box) return;
  // Screen distances are scaled by the canvas's zoom; scrollTop isn't.
  const boxRect = box.getBoundingClientRect();
  const zoom = box.offsetHeight ? boxRect.height / box.offsetHeight : 1;
  const top = (el.getBoundingClientRect().top - boxRect.top) / zoom + box.scrollTop;
  box.scrollTop = Math.max(0, top - 8);
}

/**
 * A node's content with a suggested edit marked in it, in place of its
 * content on the canvas: new text highlighted green, removed text red.
 * Read-only. `onBrand` for the blue (root and parent) nodes.
 */
export function NodePreview({
  blocks,
  proposalId,
  onBrand = false,
}: {
  blocks: PreviewBlock[];
  /** The suggestion, for the changes left out of it (shown as they are now). */
  proposalId: string;
  onBrand?: boolean;
}) {
  const skipped = skippedEdits(useEditPreview(), proposalId);
  const firstChange = blocks.findIndex((block) => block.kind !== "same");
  return (
    <div aria-label="Preview of the suggested edit" className="node-markdown flex flex-col gap-1.5 p-2">
      {blocks.map((block, i) => (
        <div key={i} ref={i === firstChange ? revealInBox : undefined} className="flex flex-col gap-1.5 *:my-0">
          <EditedBlock block={block} skipped={block.kind !== "same" && skipped.has(block.edit)} onBrand={onBrand} />
        </div>
      ))}
    </div>
  );
}
