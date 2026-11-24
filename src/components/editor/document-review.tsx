"use client";

import type { PreviewBlock } from "@/components/canvas/nodes/node-preview";
import { EditedBlock } from "@/components/shared/edit-markdown";
import { RenderIf } from "@/components/shared/render-if";
import { skippedEdits, toggleSkippedEdit, useEditPreview } from "@/lib/edit-preview";
import { cn } from "@/lib/utils";

/**
 * Scrolls the document to the first change once, when it mounts: opening
 * it while it's previewed, or turning the preview on. Only the document's
 * own scroll area: scrollIntoView would also scroll the boxes around it
 * (the page's layout, which hides its overflow), shifting the whole app.
 */
function revealFirstChange(el: HTMLElement | null) {
  const box = el?.closest<HTMLElement>("[data-document-scroll]");
  if (!el || !box) return;
  const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  // Clear of the suggestion bar floating at the top.
  box.scrollTop = Math.max(0, top - 80);
}

/**
 * A node's document with a suggested edit marked in it, in place of the
 * editor while the edit is previewed. Read-only. New text is highlighted
 * green, removed text red; a small rewrite word by word, in place. The
 * rest reads as the document does.
 *
 * With more than one change, each can be left out (Skip), to accept the
 * rest: it then shows as the document is now.
 */
export function DocumentReview({ blocks, proposalId }: { blocks: PreviewBlock[]; proposalId: string }) {
  const skipped = skippedEdits(useEditPreview(), proposalId);
  const firstChange = blocks.findIndex((block) => block.kind !== "same");
  const changes = blocks.filter((block) => block.kind !== "same").length;
  return (
    <div
      aria-label="Suggested edit, marked in the document"
      // Each block is wrapped, so the document's first-line spacing rule
      // reaches into the first wrapper.
      className="markdown-body node-document [&>:first-child>:first-child]:mt-0"
    >
      {blocks.map((block, i) => {
        const isSkipped = block.kind !== "same" && skipped.has(block.edit);
        return (
          <div
            key={i}
            ref={i === firstChange ? revealFirstChange : undefined}
            className="group/change relative"
          >
            <EditedBlock block={block} skipped={isSkipped} />
            <RenderIf condition={block.kind !== "same" && changes > 1}>
              <button
                type="button"
                aria-pressed={isSkipped}
                onClick={() => block.kind !== "same" && toggleSkippedEdit(proposalId, block.edit)}
                className={cn(
                  // Over the block's top-right corner, in the gap above it.
                  "absolute -top-3 right-0 z-1 cursor-pointer rounded-full bg-white px-2 text-caption-lg leading-5 text-fg-secondary shadow-default outline-none transition-opacity hover:text-fg-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
                  // Skipped: always shown, so you can see what's left out.
                  isSkipped ? "opacity-100" : "opacity-0 group-hover/change:opacity-100",
                )}
              >
                {isSkipped ? "Skipped · Undo" : "Skip"}
              </button>
            </RenderIf>
          </div>
        );
      })}
    </div>
  );
}
