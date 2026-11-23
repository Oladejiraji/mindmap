"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/api";
import { cn } from "@/lib/utils";

/** One block of a node's document after a suggested edit, marked with what happened to it. */
export type PreviewBlock = FunctionReturnType<typeof api.proposals.pendingByThread>[number]["preview"][number];

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
 * A node's content as it would be after a suggested edit, in place of its
 * content on the canvas: new and rewritten blocks tinted, removed ones
 * struck through. Read-only. `onBrand` for the blue (root and parent) nodes.
 */
export function NodePreview({ blocks, onBrand = false }: { blocks: PreviewBlock[]; onBrand?: boolean }) {
  const firstChange = blocks.findIndex((block) => block.kind !== "same");
  return (
    <div aria-label="Preview of the suggested edit" className="node-markdown flex flex-col gap-1.5 p-2">
      {blocks.map((block, i) => (
        <div
          key={i}
          ref={i === firstChange ? revealInBox : undefined}
          className={cn(
            "[&>*]:my-0",
            (block.kind === "added" || block.kind === "rewritten") &&
              cn("-mx-1 rounded-md px-1", onBrand ? "bg-white/20" : "bg-brand-subtle"),
            block.kind === "removed" && cn("line-through", onBrand ? "text-white/50" : "text-fg-tertiary"),
          )}
        >
          {/* Default escapes raw HTML: never add rehype-raw without rehype-sanitize. */}
          <Markdown remarkPlugins={[remarkGfm]}>{block.markdown}</Markdown>
        </div>
      ))}
    </div>
  );
}
