"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
// const MAX_MESSAGE_CONTENT = 100;
const MAX_MESSAGE_CONTENT = 32_000;
const COUNTER_THRESHOLD = MAX_MESSAGE_CONTENT * 0.8;

// ChatGPT-style composer: a floating pill with a round send button.
export function ChatInput({
  onSend,
  disabled,
  placeholder = "Send a message…",
  className,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const length = trimmed.length;
  const isOver = length > MAX_MESSAGE_CONTENT;
  const canSend = length > 0 && !isOver && !disabled;
  const showCounter = length >= COUNTER_THRESHOLD;

  const handleSend = () => {
    if (!canSend) return;
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
      <div className="flex min-h-14 items-end gap-2 rounded-[28px] bg-surface-container py-2.5 pr-2.5 pl-5 shadow-large transition-shadow focus-within:shadow-[var(--s-large),0_0_0_1px_var(--border-strong)]">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none field-sizing-content max-h-52 overflow-y-auto bg-transparent py-1.5 text-body-base text-fg-primary outline-none placeholder:text-fg-tertiary disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-inverted-solid text-on-inverted-fg transition-[background-color,opacity] hover:bg-inverted-solid-hover disabled:cursor-default disabled:bg-disabled-bg disabled:text-disabled-fg"
        >
          <ArrowUp className="size-4.5" strokeWidth={2.25} />
        </button>
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
