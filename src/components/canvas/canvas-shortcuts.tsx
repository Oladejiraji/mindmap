"use client";

import { useCallback } from "react";
import { Keyboard } from "lucide-react";
import { CloseIcon } from "@/components/icons/close-icon";
import type { Id } from "@convex/dataModel";
import type { Doc } from "@convex/dataModel";
import { useCanvasShortcuts } from "@/hooks/use-canvas-shortcuts";
import { useStoredBoolean } from "@/lib/use-stored-boolean";
import { getShortcutGroup } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

/*
 * Canvas shortcut hints. A bottom-centre pill that teaches how to add
 * nodes, adapting to whether a node is selected; "?" (or the keyboard
 * button) opens the full list. Dismissing it is remembered; a small
 * keyboard button stays to bring it back.
 */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-surface-container px-1 font-sans text-caption-lg font-medium text-fg-secondary inset-ring-[0.5px] inset-ring-border-strong">
      {children}
    </kbd>
  );
}

const CANVAS_SHORTCUTS = getShortcutGroup("Canvas");

const ALL: { keys: React.ReactNode; label: string }[] = [
  ...CANVAS_SHORTCUTS.map((s) => ({
    keys: (
      <span className="flex gap-1">
        {s.combo.map((c) => (
          <Kbd key={c}>{c}</Kbd>
        ))}
      </span>
    ),
    label: s.hint,
  })),
  { keys: <span className="text-caption-lg text-fg-secondary">Drag a handle</span>, label: "Drop a branch where you want it" },
  { keys: <span className="text-caption-lg text-fg-secondary">Double-click</span>, label: "Rename a node" },
  { keys: <span className="text-caption-lg text-fg-secondary">Click</span>, label: "Select a node, or clear on empty canvas" },
];

export function CanvasShortcuts({
  nodes,
  selectedNodeId,
  createEmptyBranch,
  enabled,
  expanded,
  onExpandedChange,
}: {
  nodes: Doc<"nodes">[];
  selectedNodeId: string | null;
  createEmptyBranch: (args: { parentId: Id<"nodes">; position?: { x: number; y: number } }) => Promise<unknown>;
  enabled: boolean;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
}) {
  const [visible, setVisible] = useStoredBoolean("mindmap:canvas-hints", true);
  const onToggleHelp = useCallback(() => onExpandedChange(!expanded), [onExpandedChange, expanded]);

  useCanvasShortcuts({ nodes, selectedNodeId, createEmptyBranch, onToggleHelp, enabled });

  const hasSelection = !!selectedNodeId;
  const isRootSelected = hasSelection && nodes.find((n) => n._id === selectedNodeId)?.parentId === null;

  if (!visible) {
    return (
      <Tip label={<>Shortcuts <span className="text-white/50">?</span></>} side="top">
        <button
          type="button"
          onClick={() => setVisible(true)}
          aria-label="Show canvas shortcuts"
          className="absolute bottom-4 left-1/2 z-10 flex size-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-surface-container text-fg-tertiary shadow-default outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Keyboard className="size-4" />
        </button>
      </Tip>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
      {expanded && (
        <div role="dialog" aria-label="Canvas shortcuts" className="w-[400px] rounded-xl bg-surface-modal p-2 shadow-large">
          <p className="px-2 pt-1 pb-2 text-caption-lg font-medium text-fg-tertiary">Canvas shortcuts</p>
          <ul className="flex flex-col">
            {ALL.map((s) => (
              <li key={s.label} className="flex min-h-8 items-center gap-3 rounded-md px-2 py-1">
                <span className="flex w-24 shrink-0 justify-end">{s.keys}</span>
                <span className="text-body-sm text-fg-primary">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex h-10 items-center gap-3 rounded-full bg-surface-container pr-1.5 pl-4 whitespace-nowrap text-body-sm text-fg-secondary shadow-default inset-ring-[0.5px] inset-ring-border-default">
        {hasSelection ? (
          <>
            <span className="flex items-center gap-1.5"><Kbd>Tab</Kbd> Add branch</span>
            {!isRootSelected && <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> Add sibling</span>}
            <span className="hidden items-center gap-1.5 @2xl:flex">Double-click to rename</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><Kbd>Tab</Kbd> Add a branch</span>
            <span className="hidden @2xl:inline">or drag from a node&apos;s handle</span>
          </>
        )}
        <span className="flex items-center gap-0.5">
          <Tip label={<>All shortcuts <span className="text-white/50">?</span></>} side="top">
            <button
              type="button"
              onClick={() => onExpandedChange(!expanded)}
              aria-expanded={expanded}
              aria-label="All shortcuts"
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-full outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                expanded && "bg-transparent-hover text-fg-primary",
              )}
            >
              <Keyboard className="size-4" />
            </button>
          </Tip>
          <button
            type="button"
            onClick={() => {
              onExpandedChange(false);
              setVisible(false);
            }}
            aria-label="Hide shortcuts"
            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CloseIcon className="size-3.5" />
          </button>
        </span>
      </div>
    </div>
  );
}
