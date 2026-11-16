"use client";

import { useRef, useCallback, useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useNodeDocumentEditor } from "@/components/editor/use-node-document-editor";
import { cn } from "@/lib/utils";

/*
 * Editing a node's document directly on its canvas card. Deliberately bare:
 * no toolbar or menus (markdown shortcuts still work); the side panel has
 * the full editor. Saves as you type and once more when you click away.
 */
export function InlineNodeEditor({
  nodeId,
  markdown,
  onBlur,
  theme = "light",
}: {
  nodeId: string;
  /** The saved markdown, live from the database. */
  markdown: string;
  onBlur: () => void;
  theme?: "light" | "dark";
}) {
  const updateContent = useMutation(api.nodes.updateContent);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { editor, flush } = useNodeDocumentEditor({
    markdown,
    placeholder: "Start writing…",
    autofocus: "end",
    className: "outline-none",
    onSave: (content) => updateContent({ nodeId: nodeId as Id<"nodes">, content }),
  });

  const flushAndClose = useCallback(() => {
    flush();
    onBlur();
  }, [flush, onBlur]);

  // Clicking anywhere outside the card closes the editor (a browser event, not React state).
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        flushAndClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [flushAndClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Keep canvas shortcuts (Tab, Enter, Delete…) from firing while typing.
      e.stopPropagation();
      if (e.key === "Escape") flushAndClose();
    },
    [flushAndClose],
  );

  const stopPropagation = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  return (
    <div
      ref={wrapperRef}
      className={cn("node-markdown inline-node-editor nodrag nopan cursor-text", theme === "dark" && "inline-node-editor-dark")}
      onKeyDown={handleKeyDown}
      onKeyUp={stopPropagation}
      onMouseDown={stopPropagation}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
