"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { decodeHtmlEntities, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Menu } from "@base-ui/react/menu";
import { cva } from "class-variance-authority";
import { GitBranch, Mic, Plus, Square } from "lucide-react";
import { SendIcon } from "@/components/icons/send-icon";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { RenderIf } from "@/components/shared/render-if";
import { PasteMarkdown } from "@/components/editor/paste-markdown";
import { SubmitOnEnter } from "./submit-on-enter";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
const MAX_MESSAGE_CONTENT = 32_000;
const COUNTER_THRESHOLD = MAX_MESSAGE_CONTENT * 0.8;

/*
 * Card composer (modelled on Vercel's assistant):
 *   ┌───────────────────────────────────────────────┐
 *   │ (●) Project   (●) Branch        ← context      │
 *   │ Send a message…                                │
 *   │ (+) (mic)                                (↑)   │
 *   └───────────────────────────────────────────────┘
 * Context chips show what the reply draws on (the project and the branch
 * you're in). "+" opens a menu (New branch). The mic is a placeholder
 * until voice input is supported. Send is a grey
 * disc that turns ink once there's text; while a reply is being written
 * it becomes Stop.
 *
 * Two sizes: default for conversations (panel, chat view) and large for
 * starting one (/new), where the box is the page's focus. Only the card
 * and the text box change; the controls stay the same.
 *
 * The text clears only once onSend resolves: if sending fails, it stays
 * so nothing typed is lost. You can keep typing while a reply is written.
 *
 * The box is a Tiptap editor that writes markdown, the format replies are
 * shown in: bold, italic, lists, inline code and code blocks, typed or
 * pasted. No headings or rules, which don't belong in a chat message.
 * Uses the hook API (useEditor): the editor lives in this one component.
 */

export type ContextChip = { icon: ReactNode; label: string };

const card = cva(
  "flex flex-col gap-2 bg-surface-container inset-ring-[0.5px] inset-ring-border-strong transition-shadow focus-within:shadow-default",
  {
    variants: {
      size: {
        default: "rounded-[20px] p-3",
        large: "rounded-[24px] p-4",
      },
    },
  },
);

/**
 * The message as markdown. The serializer also writes text's < > & as HTML
 * entities; those are put back, so the AI and the record see "<div>", not
 * "&lt;div&gt;" (the chat shows raw HTML as text, so it's safe). Its
 * backslash escapes stay: they keep a typed 5*3 from turning italic.
 * Caveat: an entity typed literally inside code is decoded too.
 */
const toMessage = (editor: Editor | null) => (editor ? decodeHtmlEntities(editor.getMarkdown()).trim() : "");

/* The scrolling frame around the editor. Its min height also holds the
 * space while the editor starts (it renders nothing on the server). */
const textBox = cva("max-h-60 w-full cursor-text overflow-y-auto px-1 py-1", {
  variants: {
    size: {
      default: "min-h-14 [&_.tiptap]:min-h-12",
      large: "min-h-24 [&_.tiptap]:min-h-22",
    },
  },
});

/* The editable area: message typography from .markdown-body (the same
 * as the replies), a size up on the large composer. */
const editorText = cva("markdown-body text-fg-primary outline-none", {
  variants: {
    size: {
      default: "",
      large: "text-body-base!",
    },
  },
});

const sendButton =
  "ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-solid text-on-brand-solid outline-none transition-colors hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary";

const roundButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-secondary inset-ring-[0.5px] inset-ring-border-strong outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:text-fg-disabled disabled:hover:bg-transparent [&_svg]:size-4.5";

export function ChatInput({
  onSend,
  busy = false,
  onStop,
  disabled = false,
  placeholder = "Send a message…",
  context,
  onNewBranch,
  defaultValue = "",
  size = "default",
  className,
}: {
  /** Sends the message. Rejects if it wasn't sent, which keeps the text in the box. */
  onSend: (content: string) => Promise<unknown>;
  /** Something is under way (a reply being written, or the page moving on after a send): no sending, but typing is fine. Without onStop, Send shows a spinner. */
  busy?: boolean;
  /** Stops the reply being written. Shown in place of Send while busy. */
  onStop?: () => void;
  /** No typing or sending at all (e.g. the chat didn't load). */
  disabled?: boolean;
  placeholder?: string;
  /** Chips shown above the box: what the reply draws on. */
  context?: ContextChip[];
  /** Adds "New branch" to the + menu. */
  onNewBranch?: () => void;
  /** Starting text, plain (e.g. handed over from the + menu, or a starter). */
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
}) {
  const [sending, setSending] = useState(false);
  // The editor's Enter handler is created once, so it sends through a ref.
  const submitRef = useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      PasteMarkdown,
      SubmitOnEnter.configure({ onSubmit: () => submitRef.current() }),
    ],
    // Plain text, not markdown: parsing would trim a starter's trailing
    // space ("Plan the launch of "), and the caret would land against it.
    content: defaultValue ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: defaultValue }] }] } : "",
    // After any starting text, so you can finish it.
    autofocus: "end",
    // Next.js renders on the server first; the editor must start on the client.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: editorText({ size }),
        "aria-label": "Message",
        "aria-multiline": "true",
        role: "textbox",
      },
    },
  });

  const message = useEditorState({ editor, selector: ({ editor }) => toMessage(editor) }) ?? "";

  // The editor isn't React state: keep its editable flag in step with the prop.
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const length = message.length;
  const isOver = length > MAX_MESSAGE_CONTENT;
  const canSend = length > 0 && !isOver && !disabled && !busy && !sending;
  const showStop = busy && onStop !== undefined;
  const showCounter = length >= COUNTER_THRESHOLD;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(message);
      // Only what was sent: anything typed meanwhile stays.
      if (editor && toMessage(editor) === message) editor.commands.clearContent(true);
    } catch {
      // The caller reported the error; the text stays for another try.
    } finally {
      setSending(false);
    }
  };

  useLayoutEffect(() => {
    submitRef.current = () => void handleSend();
  });

  return (
    <div className={className}>
      <div className={card({ size })}>
        {context && context.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Context"
          >
            {context.map((c) => (
              <span
                key={c.label}
                className="inline-flex h-8 max-w-60 items-center gap-1.5 rounded-full pr-3 pl-1 text-body-sm text-fg-primary inset-ring-[0.5px] inset-ring-border-strong"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-on-brand-solid [&_svg]:size-3.5">
                  {c.icon}
                </span>
                <span className="truncate">{c.label}</span>
              </span>
            ))}
          </div>
        )}

        <EditorContent
          editor={editor}
          className={cn(textBox({ size }), disabled && "cursor-default opacity-50")}
        />

        <div className="flex items-center gap-1.5">
          <RenderIf condition={!onNewBranch}>
            <ComingSoonButton label="Attachments" tip="Attachments are coming soon">
              <Plus strokeWidth={1.75} />
            </ComingSoonButton>
          </RenderIf>
          {onNewBranch && (
            <Menu.Root>
              <Menu.Trigger aria-label="More" className={roundButton}>
                <Plus strokeWidth={1.75} />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="z-50"
                >
                  <Menu.Popup className="corner-squircle min-w-48 rounded-4xl bg-surface-modal p-1.5 text-body-sm text-fg-primary shadow-large outline-none">
                    <Menu.Item
                      onClick={onNewBranch}
                      className="corner-squircle flex h-8 cursor-pointer items-center gap-2 rounded-[14px] px-2 outline-none data-highlighted:bg-transparent-hover [&_svg]:size-4 [&_svg]:text-fg-tertiary"
                    >
                      <GitBranch />
                      New branch
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          )}
          <ComingSoonButton label="Voice input" tip="Voice input is coming soon">
            <Mic strokeWidth={1.75} />
          </ComingSoonButton>
          <RenderIf condition={showStop}>
            <button type="button" onClick={onStop} aria-label="Stop reply" className={sendButton}>
              <Square className="size-3.5 fill-current" />
            </button>
          </RenderIf>
          <RenderIf condition={!showStop}>
            <button type="button" onClick={() => void handleSend()} disabled={!canSend} aria-label="Send" className={sendButton}>
              {sending || busy ? <Spinner className="size-4" /> : <SendIcon className="size-5" />}
            </button>
          </RenderIf>
        </div>
      </div>
      {showCounter && (
        <div
          className={cn(
            "mt-1 pr-2 text-right text-caption-lg tabular-nums",
            isOver ? "text-destructive" : "text-fg-secondary",
          )}
        >
          {length.toLocaleString()} / {MAX_MESSAGE_CONTENT.toLocaleString()}
        </div>
      )}
    </div>
  );
}

/* A control for something not built yet: it looks disabled and says so on
 * hover or focus. aria-disabled, not disabled, so it can still show its
 * tooltip. */
function ComingSoonButton({ label, tip, children }: { label: string; tip: string; children: ReactNode }) {
  return (
    <Tip label={tip} side="top">
      <button
        type="button"
        aria-disabled="true"
        aria-label={`${label} (coming soon)`}
        className={cn(roundButton, "cursor-default text-fg-disabled hover:bg-transparent hover:text-fg-disabled")}
      >
        {children}
      </button>
    </Tip>
  );
}
