"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";
import type { Message } from "@/services/messages/queries";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming === true;
  const isEmpty = message.content.length === 0;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "text-body-base text-fg-primary",
          // ChatGPT-style: your turns in a soft grey bubble, replies as plain text.
          // Radius is half a one-line bubble (20px line + 2×10px padding), so
          // one-liners are pills and longer messages keep soft corners.
          isUser ? "max-w-[75%] rounded-[20px] bg-component px-4 py-2.5 [corner-shape:round]" : "w-full"
        )}
      >
        {isEmpty && isStreaming ? (
          // Waiting for the first words: a "Thinking…" line, not the model's
          // reasoning (that needs the backend to stream it)
          <div className="flex items-center gap-2 text-body-sm" role="status">
            {/* Dotted thought orb (thinking-orbs); a still frame under reduced motion */}
            <ThinkingOrb state="working" size={20} theme="light" aria-hidden />
            <span className="gradient-text-shimmer">Thinking…</span>
          </div>
        ) : (
          <div className="markdown-body">
            {/* Default escapes raw HTML — never add rehype-raw without rehype-sanitize. */}
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-current align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
