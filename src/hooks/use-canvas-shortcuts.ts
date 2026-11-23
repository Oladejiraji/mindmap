"use client";

import { useEffect } from "react";
import type { Id } from "@convex/dataModel";
import type { Doc } from "@convex/dataModel";

export function useCanvasShortcuts({
  nodes,
  selectedNodeId,
  createBranch,
  onTidy,
  onToggleHelp,
  enabled,
}: {
  nodes: Doc<"nodes">[] | undefined;
  selectedNodeId: string | null;
  createBranch: (parentId: Id<"nodes">) => void;
  onTidy: () => void;
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
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        onTidy();
      } else if (e.key === "Tab" && !e.shiftKey) {
        const parent = selected ?? root;
        if (!parent) return;
        e.preventDefault();
        createBranch(parent._id);
      } else if (e.key === "Enter" && selected?.parentId) {
        e.preventDefault();
        createBranch(selected.parentId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, nodes, selectedNodeId, createBranch, onTidy, onToggleHelp]);
}
