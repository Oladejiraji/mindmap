"use client";

import { useEffect } from "react";
import type { Id } from "@convex/dataModel";
import type { Doc } from "@convex/dataModel";
import { handleError } from "@/lib/handle-error";

export function useCanvasShortcuts({
  nodes,
  selectedNodeId,
  createEmptyBranch,
  onToggleHelp,
  enabled,
}: {
  nodes: Doc<"nodes">[] | undefined;
  selectedNodeId: string | null;
  createEmptyBranch: (args: { parentId: Id<"nodes">; position?: { x: number; y: number } }) => Promise<unknown>;
  onToggleHelp: () => void;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled || !nodes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const onCanvas =
        !el ||
        el === document.body ||
        !!el.closest(
          ".react-flow__pane, .react-flow__node, .react-flow__renderer",
        );
      if (
        !onCanvas ||
        el?.isContentEditable ||
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA"
      )
        return;
      const root = nodes.find((n) => n.parentId === null);
      const selected =
        (selectedNodeId &&
          nodes.find((n) => n._id === selectedNodeId)) ||
        null;
      if (e.key === "?") {
        e.preventDefault();
        onToggleHelp();
      } else if (e.key === "Tab" && !e.shiftKey) {
        const parent = selected ?? root;
        if (!parent) return;
        e.preventDefault();
        createEmptyBranch({ parentId: parent._id }).catch((err) =>
          handleError(err, "Failed to create branch"),
        );
      } else if (e.key === "Enter" && selected?.parentId) {
        e.preventDefault();
        createEmptyBranch({ parentId: selected.parentId }).catch((err) =>
          handleError(err, "Failed to create branch"),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, nodes, selectedNodeId, createEmptyBranch, onToggleHelp]);
}
