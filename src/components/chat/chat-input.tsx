"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { GitBranch, Mic, Plus } from "lucide-react";
import { SendIcon } from "@/components/icons/send-icon";
import { cn } from "@/lib/utils";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
// const MAX_MESSAGE_CONTENT = 100;
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
 * you're in). "+" opens a menu (New branch); mic dictates via the
 * browser's SpeechRecognition (hidden where unsupported). Send is a grey
 * disc that turns ink once there's text.
 */

export type ContextChip = { icon: ReactNode; label: string };

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noopSubscribe = () => () => {};

const roundButton =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-secondary inset-ring-[0.5px] inset-ring-border-strong outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:text-fg-disabled disabled:hover:bg-transparent [&_svg]:size-4.5";

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Send a message…",
  context,
  onNewBranch,
  defaultValue = "",
  className,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
  /** Chips shown above the box: what the reply draws on. */
  context?: ContextChip[];
  /** Adds "New branch" to the + menu. */
  onNewBranch?: () => void;
  /** Starting text (e.g. handed over from the + menu). */
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const baseRef = useRef("");
  // Server render: assume no speech support, so hydration matches.
  const canDictate = useSyncExternalStore(noopSubscribe, () => getRecognitionCtor() !== null, () => false);

  const trimmed = value.trim();
  const length = trimmed.length;
  const isOver = length > MAX_MESSAGE_CONTENT;
  const canSend = length > 0 && !isOver && !disabled;
  const showCounter = length >= COUNTER_THRESHOLD;

  const stopDictation = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const toggleDictation = () => {
    if (listening) return stopDictation();
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    baseRef.current = value ? `${value.replace(/\s+$/, "")} ` : "";
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setValue(baseRef.current + text);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const handleSend = () => {
    if (!canSend) return;
    if (listening) stopDictation();
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 rounded-[20px] bg-surface-container p-3 inset-ring-[0.5px] inset-ring-border-strong transition-shadow focus-within:shadow-default">
        {context && context.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Context">
            {context.map((c) => (
              <span
                key={c.label}
                className="inline-flex h-8 max-w-60 items-center gap-1.5 rounded-full pr-3 pl-1 text-body-sm text-fg-primary inset-ring-[0.5px] inset-ring-border-strong"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-inverted-solid text-on-inverted-fg [&_svg]:size-3.5">
                  {c.icon}
                </span>
                <span className="truncate">{c.label}</span>
              </span>
            ))}
          </div>
        )}

        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening…" : placeholder}
          aria-label="Message"
          disabled={disabled}
          rows={2}
          className="field-sizing-content max-h-60 min-h-14 w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5">
          {onNewBranch && (
            <Menu.Root>
              <Menu.Trigger aria-label="More" className={roundButton}>
                <Plus strokeWidth={1.75} />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
                  <Menu.Popup className="min-w-48 rounded-lg bg-surface-modal p-1 text-body-sm text-fg-primary shadow-large outline-none">
                    <Menu.Item
                      onClick={onNewBranch}
                      className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 outline-none data-highlighted:bg-transparent-hover [&_svg]:size-4 [&_svg]:text-fg-tertiary"
                    >
                      <GitBranch />
                      New branch
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          )}
          {canDictate && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={listening ? "Stop dictation" : "Dictate"}
              aria-pressed={listening}
              className={cn(roundButton, listening && "bg-brand-subtle text-brand-fg inset-ring-brand-border")}
            >
              <Mic strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send"
            className="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-inverted-solid text-on-inverted-fg outline-none transition-colors hover:bg-inverted-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
          >
            <SendIcon className="size-5" />
          </button>
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
