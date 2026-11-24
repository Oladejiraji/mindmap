"use client";

import { cn } from "@/lib/utils";
import { isPreviewed, toggleEditPreview, useEditPreview } from "@/lib/edit-preview";

/**
 * Turns the preview of a node's suggested edit off and on again (it's on
 * by default): the node shows how it would look after the edit.
 * Underlined text, so it sits in the node's header. `onBrand` for the
 * blue nodes.
 */
export function EditPreviewButton({
  proposalId,
  onBrand = false,
  className,
}: {
  proposalId: string;
  onBrand?: boolean;
  className?: string;
}) {
  const previewing = isPreviewed(useEditPreview(), proposalId);
  return (
    <button
      type="button"
      aria-pressed={previewing}
      onClick={(e) => {
        // On the canvas, a click on a node also selects it and opens its panel.
        e.stopPropagation();
        toggleEditPreview(proposalId);
      }}
      className={cn(
        "nodrag nopan shrink-0 cursor-pointer rounded-sm text-caption-lg leading-5 whitespace-nowrap underline decoration-1 underline-offset-2 outline-none motion-safe:animate-in motion-safe:fade-in-0",
        onBrand
          ? "text-white/70 decoration-white/40 hover:text-white hover:decoration-white focus-visible:ring-1 focus-visible:ring-white/30"
          : "text-fg-secondary decoration-fg-tertiary/50 hover:text-fg-primary hover:decoration-current focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      {previewing ? "Exit preview" : "Preview"}
    </button>
  );
}
