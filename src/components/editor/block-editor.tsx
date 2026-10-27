"use client";

import { useRef, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";

export function BlockEditor({
  initialContent,
  onChange,
}: {
  initialContent?: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
  });

  const handleChange = useCallback(() => {
    onChangeRef.current(editor.document);
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="light"
      sideMenu={true}
      formattingToolbar={true}
      slashMenu={true}
    />
  );
}
