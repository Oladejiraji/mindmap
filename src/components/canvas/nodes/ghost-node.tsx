"use client";

import { Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { BranchIcon } from "@/lib/svg";
import { CustomHandle } from "@/components/auth-canvas/custom-handle";
import { EditMarkdown } from "@/components/shared/edit-markdown";
import { skippedBranches, toggleSkippedBranch, useEditPreview } from "@/lib/edit-preview";
import { CANVAS_NODE_WIDTH } from "./types";

/** A branch the AI suggests: its suggestion, which one it is, and what it holds. */
export interface GhostNodeData {
  proposalId: string;
  /** Its index among the suggestion's branches. */
  branch: number;
  title: string;
  /** Its starting document, as markdown. */
  content: string;
  [key: string]: unknown;
}

/**
 * A branch the AI suggests, shown where it would go before it's accepted:
 * dashed and faded, like a leaf node that isn't there yet. Skip leaves it
 * out when accepting (it fades further); Undo puts it back. It can't be
 * dragged, selected or opened.
 */
export function GhostNode({ data }: NodeProps) {
  const { proposalId, branch, title, content } = data as GhostNodeData;
  const skipped = skippedBranches(useEditPreview(), proposalId).has(branch);

  return (
    <div
      className={cn("group transition-opacity motion-safe:animate-in motion-safe:fade-in-0", skipped && "opacity-40")}
      style={{ width: CANVAS_NODE_WIDTH }}
    >
      <div className="relative rounded-3xl border border-dashed border-brand-solid/40 bg-white/70 p-2">
        <CustomHandle type="target" position={Position.Top} />
        <div className="flex h-5 items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-fg-secondary">
            <div className="flex size-5 shrink-0 items-center justify-center opacity-60">
              <BranchIcon pathClassName="fill-foreground" />
            </div>
            <span className="min-w-0 truncate text-body-sm font-medium">{title}</span>
            <span className="shrink-0 text-caption-lg text-fg-tertiary">· suggested</span>
          </div>
          <button
            type="button"
            aria-pressed={skipped}
            onClick={(e) => {
              // A click on a node also selects it.
              e.stopPropagation();
              toggleSkippedBranch(proposalId, branch);
            }}
            className={cn(
              "nodrag nopan shrink-0 cursor-pointer rounded-sm pl-2 text-caption-lg leading-5 whitespace-nowrap text-fg-secondary underline decoration-fg-tertiary/50 underline-offset-2 outline-none hover:text-fg-primary focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring",
              // Skipped: always shown, so it's clear how to undo.
              !skipped && "opacity-0 group-hover:opacity-100",
            )}
          >
            {skipped ? "Skipped · Undo" : "Skip"}
          </button>
        </div>
        <div className="nowheel node-markdown mt-3 max-h-40 overflow-y-auto overscroll-contain rounded-lg bg-background-2/70 p-2 text-fg-secondary [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <EditMarkdown markdown={content} />
        </div>
      </div>
    </div>
  );
}
