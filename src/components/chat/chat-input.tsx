"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { RenderIf } from "@/components/shared/render-if";
import { PasteMarkdown } from "@/components/editor/paste-markdown";
import { SubmitOnEnter } from "./submit-on-enter";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
const MAX_MESSAGE_CONTENT = 32_000;
const COUNTER_THRESHOLD = MAX_MESSAGE_CONTENT * 0.8;

/** A chip above the composer naming something the reply draws on. */
type ContextChip = {
  icon: ReactNode;
  label: string;
};

export type Starter = {
  /** The start of a sentence for the user to finish, e.g. "Plan the launch of ". */
  text: string;
  icon: ReactNode;
};

/* A plain-text document, one paragraph per line (no markdown parsing,
 * which would trim a trailing space). */
const textDoc = (text: string) => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});

// A picked starter types itself in at this pace: fast enough to feel like
// the box filled itself, not a typewriter.
const MS_PER_CHAR = 12;

// One per starter row (there are always four), in varied lengths.
const STARTER_SKELETON_WIDTHS = ["w-40", "w-48", "w-36", "w-44"];

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

/** The box's text as markdown, with "&lt;" turned back into "<". */
const toMessage = (editor: Editor | null) =>
  editor ? decodeHtmlEntities(editor.getMarkdown()).trim() : "";

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
  "ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-solid text-on-brand-solid shadow-button-primary outline-none transition-[color,background-color,box-shadow] hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary disabled:shadow-none";

const roundButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-secondary inset-ring-[0.5px] inset-ring-border-strong outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:text-fg-disabled disabled:hover:bg-transparent [&_svg]:size-4.5";

export type ChatInputProps = {
  /** Called with the message when the user sends. If it throws, the text stays in the box. */
  onSend: (content: string) => Promise<unknown>;
  /** True while a reply is being written. The user can type but not send. */
  busy?: boolean;
  /** Called when the user stops the reply. */
  onStop?: () => void;
  /** Turns the whole box off. */
  disabled?: boolean;
  placeholder?: string;
  /** Chips shown above the box. */
  context?: ContextChip[];
  /** Adds a "New branch" option to the + button. */
  onNewBranch?: () => void;
  /** Text already in the box when it first shows. */
  defaultValue?: string;
  /** Suggested prompts shown under the box while it's empty. */
  starters?: Starter[];
  /** Shows placeholder rows while the starters load. */
  startersLoading?: boolean;
  /** Use "large" when the box is the main thing on the page. */
  size?: "default" | "large";
  className?: string;
};

/**
 * The chat composer: a markdown text box (Tiptap) with Send/Stop, a +
 * button, and optional context chips and starters.
 *
 * Enter sends, Shift+Enter breaks the line; inside a list or code block,
 * Enter edits and Cmd/Ctrl+Enter sends. The text clears only once
 * `onSend` resolves. You can keep typing while a reply is written.
 */
export function ChatInput({
  onSend,
  busy = false,
  onStop,
  disabled = false,
  placeholder = "Send a message…",
  context,
  onNewBranch,
  defaultValue = "",
  starters,
  startersLoading = false,
  size = "default",
  className,
}: ChatInputProps) {
  const [sending, setSending] = useState(false);
  // The editor's handlers are created once, so they call through refs.
  const submitRef = useRef<() => void>(() => {});
  const finishFillRef = useRef<() => void>(() => {});
  // The starter being hovered, shown as the placeholder.
  const previewRef = useRef<string | null>(null);
  // A starter typing itself in.
  const fillRef = useRef<{ frame: number; text: string } | null>(null);
  // What was typed into the plain box shown until the editor starts.
  // Saved as the box goes, since the editor's onCreate fires after that.
  const typedRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({
        placeholder: () =>
          previewRef.current ? `${previewRef.current.trim()}…` : placeholder,
      }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      PasteMarkdown,
      SubmitOnEnter.configure({ onSubmit: () => submitRef.current() }),
    ],
    // Plain text, not markdown: parsing would trim a starter's trailing
    // space ("Plan the launch of "), and the caret would land against it.
    content: defaultValue ? textDoc(defaultValue) : "",
    // After any starting text, so you can finish it.
    autofocus: "end",
    // Next.js renders on the server first; the editor must start on the client.
    immediatelyRender: false,
    // Carry over anything typed into the plain box before the editor started.
    onCreate: ({ editor }) => {
      const typed = typedRef.current;
      if (typed === null || typed === defaultValue) return;
      editor.commands.setContent(textDoc(typed));
      editor.commands.focus("end");
    },
    editorProps: {
      attributes: {
        class: editorText({ size }),
        "aria-label": "Message",
        "aria-multiline": "true",
        role: "textbox",
      },
      // Typing or clicking while a starter fills in completes it first,
      // so the key lands after the whole starter. Returning false lets the
      // event carry on as usual.
      handleKeyDown: () => {
        finishFillRef.current();
        return false;
      },
      handleDOMEvents: {
        mousedown: () => {
          finishFillRef.current();
          return false;
        },
      },
    },
  });

  const message =
    useEditorState({ editor, selector: ({ editor }) => toMessage(editor) }) ??
    "";

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
    // Read the box itself: Enter mid-fill completes the starter just before.
    const text = toMessage(editor);
    if (!canSend || !text || text.length > MAX_MESSAGE_CONTENT) return;
    setSending(true);
    try {
      await onSend(text);
      // Only what was sent: anything typed meanwhile stays.
      if (editor && toMessage(editor) === text)
        editor.commands.clearContent(true);
    } catch {
      // The caller reported the error; the text stays for another try.
    } finally {
      setSending(false);
    }
  };

  // The placeholder reads previewRef; an empty transaction redraws it.
  const preview = (text: string | null) => {
    previewRef.current = text;
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr);
  };

  // Replaces the box's text without an undo step per character.
  const showText = (text: string) =>
    editor
      ?.chain()
      .command(({ tr }) => {
        tr.setMeta("addToHistory", false);
        return true;
      })
      .setContent(textDoc(text))
      .focus("end")
      .run();

  const finishFill = () => {
    const fill = fillRef.current;
    if (!fill) return;
    cancelAnimationFrame(fill.frame);
    fillRef.current = null;
    showText(fill.text);
  };

  // Types the starter in, caret at the end so you can finish the sentence.
  // With reduced motion it just appears.
  const pick = (text: string) => {
    preview(null);
    finishFill();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showText(text);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const count = Math.max(1, Math.ceil((now - start) / MS_PER_CHAR));
      showText(text.slice(0, count));
      if (count < text.length && fillRef.current)
        fillRef.current.frame = requestAnimationFrame(step);
      else fillRef.current = null;
    };
    fillRef.current = { frame: requestAnimationFrame(step), text };
  };

  useLayoutEffect(() => {
    submitRef.current = () => void handleSend();
    finishFillRef.current = finishFill;
  });

  // Unmounting mid-fill: stop the frames, which would write to a gone editor.
  useEffect(
    () => () => {
      if (fillRef.current) cancelAnimationFrame(fillRef.current.frame);
    },
    [],
  );

  const hasStarters = !!starters?.length && !disabled;
  // Typing hides the starters but keeps their space, so the box doesn't move.
  const startersHidden = length > 0;

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

        <RenderIf condition={!editor}>
          {/* Uncontrolled, so hydration keeps what's been typed */}
          <div
            className={cn(
              textBox({ size }),
              disabled && "cursor-default opacity-50",
            )}
          >
            <textarea
              ref={(el) => {
                if (!el) return;
                return () => {
                  typedRef.current = el.value;
                };
              }}
              defaultValue={defaultValue}
              placeholder={placeholder}
              readOnly={disabled}
              aria-label="Message"
              className={cn(
                editorText({ size }),
                "block w-full resize-none bg-transparent field-sizing-content placeholder:text-muted-foreground",
                size === "large" ? "min-h-22" : "min-h-12",
              )}
            />
          </div>
        </RenderIf>
        <RenderIf condition={!!editor}>
          <EditorContent
            editor={editor}
            className={cn(
              textBox({ size }),
              disabled && "cursor-default opacity-50",
            )}
          />
        </RenderIf>

        <div className="flex items-center gap-1.5">
          <RenderIf condition={!onNewBranch}>
            <ComingSoonButton
              label="Attachments"
              tip="Attachments are coming soon"
            >
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
          <ComingSoonButton
            label="Voice input"
            tip="Voice input is coming soon"
          >
            <Mic strokeWidth={1.75} />
          </ComingSoonButton>
          <RenderIf condition={showStop}>
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop reply"
              className={sendButton}
            >
              <Square className="size-3.5 fill-current" />
            </button>
          </RenderIf>
          <RenderIf condition={!showStop}>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              aria-label="Send"
              className={sendButton}
            >
              {sending || busy ? (
                <Spinner className="size-4" />
              ) : (
                <SendIcon className="size-5" />
              )}
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
      <RenderIf condition={startersLoading && length === 0}>
        <div aria-hidden className="mt-3 flex flex-col">
          {STARTER_SKELETON_WIDTHS.map((width) => (
            <div key={width} className="flex h-9 items-center gap-2.5 px-3">
              <Skeleton className="size-4 shrink-0 rounded bg-component-hover" />
              <Skeleton className={cn("h-3 rounded bg-component-hover", width)} />
            </div>
          ))}
        </div>
      </RenderIf>
      <RenderIf condition={hasStarters}>
        {/* Plain rows, not chips: things you could say, not buttons */}
        <ul
          aria-label="Ways to start"
          inert={startersHidden}
          className={cn(
            "mt-3 flex flex-col transition-[opacity,visibility] duration-200 motion-safe:animate-fade-up",
            startersHidden && "invisible opacity-0",
          )}
        >
          {starters?.map((s) => (
            <li key={s.text}>
              <button
                type="button"
                onClick={() => pick(s.text)}
                onMouseEnter={() => preview(s.text)}
                onMouseLeave={() => preview(null)}
                onFocus={() => preview(s.text)}
                onBlur={() => preview(null)}
                className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-body-sm text-fg-secondary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:bg-transparent-hover focus-visible:text-fg-primary [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-tertiary"
              >
                {s.icon}
                <span className="truncate">{s.text.trim()}…</span>
              </button>
            </li>
          ))}
        </ul>
      </RenderIf>
    </div>
  );
}

/* A control for something not built yet: it looks disabled and says so on
 * hover or focus. aria-disabled, not disabled, so it can still show its
 * tooltip. */
function ComingSoonButton({
  label,
  tip,
  children,
}: {
  label: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <Tip label={tip} side="top">
      <button
        type="button"
        aria-disabled="true"
        aria-label={`${label} (coming soon)`}
        className={cn(
          roundButton,
          "cursor-default text-fg-disabled hover:bg-transparent hover:text-fg-disabled",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}
