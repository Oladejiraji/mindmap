"use client";

import { useRef, useCallback, useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { useNodeDocumentEditor } from "@/components/editor/use-node-document-editor";
import { cn } from "@/lib/utils";

/*
 * Editing a node's document directly on its canvas card. Deliberately bare:
 * no toolbar or menus (markdown shortcuts still work); the side panel has
 * the full editor. Saves as you type and once more when you click away.
 */
export function InlineNodeEditor({
  nodeId,
  initialMarkdown,
  onBlur,
  theme = "light",
}: {
  nodeId: string;
  initialMarkdown: string;
  onBlur: () => void;
  theme?: "light" | "dark";
}) {
  const updateContent = useMutation(api.nodes.updateContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(initialMarkdown);

  const save = useCallback(() => {
    updateContent({ nodeId: nodeId as Id<"nodes">, content: latestRef.current }).catch((err) =>
      handleError(err, "Failed to save content"),
    );
  }, [nodeId, updateContent]);

  const editor = useNodeDocumentEditor({
    markdown: initialMarkdown,
    placeholder: "Start writing…",
    autofocus: "end",
    className: "outline-none",
    onChange: (markdown) => {
      latestRef.current = markdown;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(save, 500);
    },
  });

  const flushAndClose = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      save();
    }
    onBlur();
  }, [onBlur, save]);

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
