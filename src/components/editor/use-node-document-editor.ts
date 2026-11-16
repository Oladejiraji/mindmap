"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { handleError } from "@/lib/handle-error";
import { PasteMarkdown } from "./paste-markdown";

const SAVE_DELAY_MS = 500;

const same = (a: string, b: string) => a.trim() === b.trim();

/*
 * A node's document editor. Node content is stored as markdown, so the
 * editor loads markdown and saves markdown. It only offers what markdown
 * can express (no underline, colors or alignment), so saving never drops
 * anything the user made.
 *
 * The database is the source of truth. Several places can write the same
 * document (the canvas card, the side panel, another browser tab, an
 * accepted AI edit), and each save replaces the whole document. So the
 * editor follows the database: when the saved markdown changes and the
 * editor has nothing unsaved, it loads the new version. While the user has
 * unsaved typing, outside changes are skipped and the user's next save
 * wins.
 *
 * Uses the hook API (useEditor): each editor lives in a single component.
 */
export function useNodeDocumentEditor({
  markdown,
  placeholder,
  onSave,
  autofocus = false,
  className,
}: {
  /** The saved markdown, live from the database. */
  markdown: string;
  placeholder: string;
  /** Persist the document. Called after typing pauses, and on flush. */
  onSave: (markdown: string) => Promise<unknown>;
  autofocus?: boolean | "end";
  className?: string;
}) {
  // Latest props, for callbacks that outlive a render (the editor, timers, saves).
  const onSaveRef = useRef(onSave);
  const markdownRef = useRef(markdown);

  // What the editor holds, as markdown, as of its last load or save.
  const syncedRef = useRef(markdown);
  // Typing that hasn't been sent yet, and saves that haven't finished.
  const unsavedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inFlightRef = useRef(0);

  const editor = useEditor({
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
    // Created once per mount, so this reads the latest flush through a ref.
    onUpdate: ({ editor }) => {
      unsavedRef.current = editor.getMarkdown();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
    },
  });

  // Load the saved document if it changed elsewhere and nothing here is pending.
  const pullSaved = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    if (unsavedRef.current !== null || inFlightRef.current > 0) return;
    const saved = markdownRef.current;
    if (same(saved, syncedRef.current)) return;
    syncedRef.current = saved;
    // Not a user edit, so it must not trigger a save.
    editor.commands.setContent(saved, { contentType: "markdown", emitUpdate: false });
  }, [editor]);

  /** Save pending typing now. */
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = unsavedRef.current;
    if (pending === null) return;
    unsavedRef.current = null;
    syncedRef.current = pending;
    inFlightRef.current += 1;
    onSaveRef.current(pending)
      .catch((err) => {
        handleError(err, "Failed to save content");
        // Keep the text as unsaved so the next edit retries it and the
        // database doesn't overwrite it meanwhile.
        if (unsavedRef.current === null) unsavedRef.current = pending;
      })
      .finally(() => {
        inFlightRef.current -= 1;
        // A change from elsewhere may have arrived while this save was pending.
        pullSaved();
      });
  }, [pullSaved]);
  const flushRef = useRef(flush);

  // Runs before the effects below, so they see this render's values.
  useLayoutEffect(() => {
    onSaveRef.current = onSave;
    markdownRef.current = markdown;
    flushRef.current = flush;
  });

  // Syncing an external system (the Tiptap editor) with the saved document.
  useEffect(() => {
    pullSaved();
  }, [markdown, pullSaved]);

  // Leaving the editor saves whatever was typed in the last moment.
  useEffect(() => () => flush(), [flush]);

  return { editor, flush };
}
