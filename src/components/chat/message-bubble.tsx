"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          // ChatGPT-style: your turns in a soft grey bubble, replies as plain text
          isUser ? "max-w-[75%] rounded-3xl bg-component px-4 py-2.5" : "w-full"
        )}
      >
        {isEmpty && isStreaming ? (
          <span className="inline-flex gap-1">
            <span className="size-1.5 animate-pulse rounded-full bg-current opacity-40" />
            <span className="size-1.5 animate-pulse rounded-full bg-current opacity-40 [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-current opacity-40 [animation-delay:300ms]" />
          </span>
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
