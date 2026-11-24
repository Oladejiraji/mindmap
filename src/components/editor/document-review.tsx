"use client";

import type { PreviewBlock } from "@/components/canvas/nodes/node-preview";
import { EditMarkdown } from "@/components/shared/edit-markdown";

/**
 * Scrolls the panel to the first change once, when it mounts: opening the
 * document while it's previewed, or turning the preview on.
 */
function revealFirstChange(el: HTMLElement | null) {
  el?.scrollIntoView({ block: "start" });
}

/**
 * A node's document with a suggested edit marked in it, in place of the
 * editor while the edit is previewed. Read-only. New text is highlighted
 * green; removed text red (a rewritten block shows
 * both: the old, then the new). The rest reads as the document does.
 */
export function DocumentReview({ blocks }: { blocks: PreviewBlock[] }) {
  const firstChange = blocks.findIndex((block) => block.kind !== "same");
  return (
    <div
      aria-label="Suggested edit, marked in the document"
      // Each block is wrapped, so the document's first-line spacing rule
      // reaches into the first wrapper.
      className="markdown-body node-document [&>:first-child>:first-child]:mt-0"
    >
      {blocks.map((block, i) => (
        // scroll-mt: clear of the suggestion bar floating at the top.
        <div key={i} ref={i === firstChange ? revealFirstChange : undefined} className="scroll-mt-20">
          {block.kind === "rewritten" && <EditMarkdown markdown={block.before} mark="removed" />}
          <EditMarkdown
            markdown={block.markdown}
            mark={block.kind === "same" ? undefined : block.kind === "removed" ? "removed" : "added"}
          />
        </div>
      ))}
    </div>
  );
}
