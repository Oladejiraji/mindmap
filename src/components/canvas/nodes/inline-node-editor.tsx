"use client";

import { useRef, useCallback, useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

export function InlineNodeEditor({
  nodeId,
  initialContent,
  onBlur,
}: {
  nodeId: string;
  initialContent?: Block[];
  onBlur: () => void;
}) {
  const updateContent = useMutation(api.nodes.updateContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
  });

  const save = useCallback(() => {
    updateContent({
      nodeId: nodeId as Id<"nodes">,
      content: editor.document,
    }).catch((err) => handleError(err, "Failed to save content"));
  }, [editor, nodeId, updateContent]);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 500);
  }, [save]);

  useEffect(() => {
    editor.focus();
  }, [editor]);

  const flushAndClose = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      save();
    }
    onBlur();
  }, [onBlur, save]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
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
      e.stopPropagation();
      if (e.key === "Escape") flushAndClose();
    },
    [flushAndClose],
  );

  const stopPropagation = useCallback(
    (e: React.SyntheticEvent) => e.stopPropagation(),
    [],
  );

  return (
    <div
      ref={wrapperRef}
      className="inline-node-editor nodrag nopan cursor-text"
      onKeyDown={handleKeyDown}
      onKeyUp={stopPropagation}
      onMouseDown={stopPropagation}
    >
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        sideMenu={false}
        formattingToolbar={false}
        slashMenu={false}
      />
    </div>
  );
}
