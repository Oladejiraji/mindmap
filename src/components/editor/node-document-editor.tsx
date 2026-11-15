"use client";

import { EditorContent } from "@tiptap/react";
import { useNodeDocumentEditor } from "./use-node-document-editor";
import { SelectionToolbar } from "./selection-toolbar";

/** The node's document in the side panel: full editor with a selection toolbar. */
export function NodeDocumentEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useNodeDocumentEditor({
    markdown: initialMarkdown,
    placeholder: "Write, or paste notes…",
    onChange,
    // Same typography as chat messages, so the document reads like the rest of the panel.
    className: "markdown-body min-h-40 outline-none",
  });

  if (!editor) return null;

  return (
    <>
      <EditorContent editor={editor} />
      <SelectionToolbar editor={editor} />
    </>
  );
}
