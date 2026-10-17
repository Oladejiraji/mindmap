"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Menu } from "@base-ui/react/menu";
import { ArrowUp, AudioLines, Brain, GitBranch, Mic, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
// const MAX_MESSAGE_CONTENT = 100;
const MAX_MESSAGE_CONTENT = 32_000;
const COUNTER_THRESHOLD = MAX_MESSAGE_CONTENT * 0.8;

/*
 * ChatGPT-style composer.
 *   [+]  Ask Mindmap…            Think  [mic]  (●)
 * - "+" opens a menu (New branch, when a handler is given).
 * - Think mirrors ChatGPT's reasoning toggle; it's shown but inactive until
 *   the backend supports a reasoning mode.
 * - Mic dictates into the box via the browser's SpeechRecognition (hidden
 *   where unsupported).
 * - The blue button is a voice waveform while empty (starts dictation) and
 *   an up-arrow once there's text (sends).
 * The pill grows into a rounded panel as the text wraps.
 */

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

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask Mindmap",
  onNewBranch,
  className,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
  /** Adds "New branch" to the + menu. */
  onNewBranch?: () => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
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

  const iconButton =
    "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-primary outline-none transition-colors hover:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:text-fg-disabled disabled:hover:bg-transparent";

  return (
    <div className={className}>
      <div className="flex min-h-13 items-end gap-1 rounded-[26px] bg-surface-container p-2 shadow-default inset-ring-[0.5px] inset-ring-border-default transition-shadow focus-within:shadow-large">
        {onNewBranch ? (
          <Menu.Root>
            <Menu.Trigger aria-label="More" className={iconButton}>
              <Plus className="size-5" strokeWidth={1.75} />
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
        ) : (
          <span className="w-2 shrink-0" />
        )}

        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening…" : placeholder}
          aria-label="Message"
          disabled={disabled}
          rows={1}
          className="field-sizing-content max-h-52 min-h-9 w-full resize-none self-center overflow-y-auto bg-transparent px-1 py-1.5 text-body-lg text-fg-primary outline-none placeholder:text-fg-tertiary disabled:opacity-50"
        />

        <button
          type="button"
          disabled
          title="Think — extended reasoning isn't available yet"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-body-lg text-fg-disabled"
        >
          <Brain className="size-5" strokeWidth={1.75} />
          Think
        </button>

        {canDictate && (
          <button
            type="button"
            onClick={toggleDictation}
            aria-label={listening ? "Stop dictation" : "Dictate"}
            aria-pressed={listening}
            className={cn(iconButton, listening && "text-brand-fg")}
          >
            <Mic className="size-5" strokeWidth={1.75} />
          </button>
        )}

        {trimmed.length > 0 || !canDictate ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-solid text-on-brand-solid outline-none transition-colors hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-disabled-bg disabled:text-disabled-fg"
          >
            <ArrowUp className="size-5" strokeWidth={2.25} />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleDictation}
            disabled={disabled}
            aria-label={listening ? "Stop voice input" : "Voice input"}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-solid text-on-brand-solid outline-none transition-colors hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-disabled-bg disabled:text-disabled-fg"
          >
            {listening ? <Square className="size-3.5 fill-current" /> : <AudioLines className="size-5" strokeWidth={2} />}
          </button>
        )}
      </div>
      {showCounter && (
        <div
          className={cn(
            "mt-1 pr-2 text-right text-caption-lg tabular-nums",
            isOver ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {length.toLocaleString()} / {MAX_MESSAGE_CONTENT.toLocaleString()}
        </div>
      )}
    </div>
  );
}
