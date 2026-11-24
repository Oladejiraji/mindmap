"use client";

import { EditorContent } from "@tiptap/react";
import { useNodeDocumentEditor } from "./use-node-document-editor";
import { SelectionToolbar } from "./selection-toolbar";

/** The node's document in the side panel: full editor with a selection toolbar. */
export function NodeDocumentEditor({
  markdown,
  onSave,
}: {
  /** The saved markdown, live from the database. */
  markdown: string;
  onSave: (markdown: string) => Promise<unknown>;
}) {
  const { editor } = useNodeDocumentEditor({
    markdown,
    placeholder: "Write, or paste notes…",
    onSave,
    // Same typography as chat messages, so the document reads like the rest of the panel.
    className: "markdown-body node-document min-h-40 outline-none",
  });

  if (!editor) return null;

  return (
    <>
      <EditorContent editor={editor} />
      <SelectionToolbar editor={editor} />
    </>
  );
}
