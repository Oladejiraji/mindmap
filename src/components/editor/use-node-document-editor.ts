"use client";

import { useRef } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { PasteMarkdown } from "./paste-markdown";

/*
 * A node's document editor. Node content is stored as markdown, so the
 * editor loads markdown and reports markdown. It only offers what markdown
 * can express (no underline, colors or alignment), so saving never drops
 * anything the user made.
 *
 * Uses the hook API (useEditor): each editor lives in a single component.
 */
export function useNodeDocumentEditor({
  markdown,
  placeholder,
  onChange,
  autofocus = false,
  className,
}: {
  markdown: string;
  placeholder: string;
  onChange: (markdown: string) => void;
  autofocus?: boolean | "end";
  className?: string;
}) {
  // The editor is created once per mount; read the latest callback through a ref.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: { openOnClick: false, autolink: true },
      }),
      TableKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      PasteMarkdown,
    ],
    content: markdown,
    contentType: "markdown",
    autofocus,
    // Next.js renders on the server first; the editor must start on the client.
    immediatelyRender: false,
    editorProps: { attributes: { class: className ?? "" } },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown()),
  });
}
