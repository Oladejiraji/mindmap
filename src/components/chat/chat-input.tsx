"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

// Must match MAX_MESSAGE_CONTENT in convex/lib/validation.ts.
// const MAX_MESSAGE_CONTENT = 100;
const MAX_MESSAGE_CONTENT = 32_000;
const COUNTER_THRESHOLD = MAX_MESSAGE_CONTENT * 0.8;

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
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
    <div className="px-4 py-3">
      <div className="border flex items-end gap-2 rounded-3xl min-h-14 pl-6 pr-2.5 py-2.5">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none field-sizing-content max-h-40 overflow-y-auto bg-transparent py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
        >
          <SendHorizonal className="size-4" />
        </button>
      </div>
      {showCounter && (
        <div
          className={cn(
            "mt-1 pr-2 text-right text-xs tabular-nums",
            isOver ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {length.toLocaleString()} / {MAX_MESSAGE_CONTENT.toLocaleString()}
        </div>
      )}
    </div>
  );
}
