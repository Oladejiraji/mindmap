"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { ChatInput } from "@/components/chat/chat-input";

/*
 * New-tab empty state: a chat, ChatGPT-style. There is no project form —
 * the first message starts the project. Sending creates the thread (and
 * its root node) via threads.create, sends the message to the root node
 * via chat.sendMessage, and lands on the canvas with the root's side panel
 * open on its chat. The reply streams in there and suggests the root's
 * first document, which is the core loop: ask, accept, and the node grows.
 */

export function NewProjectComposer() {
  const router = useRouter();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useAction(api.chat.sendMessage);
  const [starting, setStarting] = useState(false);
  // The + menu can hand over text typed into its search (?name=).
  const initial = useSearchParams().get("name") ?? "";

  const start = async (content: string) => {
    setStarting(true);
    try {
      const { threadId, rootNodeId } = await createThread({});
      // Land on the canvas with the root's panel open on its chat: the reply
      // streams in there, and its suggested first document shows under it.
      router.replace(`${routes.node(threadId, rootNodeId)}&tab=chat`);
      // This tab's page is gone by the time the reply streams in.
      sendMessage({ nodeId: rootNodeId, content }).catch((err) => handleError(err, "Failed to send message"));
    } catch (err) {
      handleError(err, "Failed to start chat");
      setStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-heading-5 font-semibold text-fg-primary">What are you trying to figure out?</h1>
        <p className="mt-2 max-w-md text-body-sm text-fg-secondary">
          Start with a question. Branch the conversation as it grows; every branch becomes a node you can trace on the canvas.
        </p>
      </div>
      <div className="shrink-0 px-6 pb-6">
        <div className="mx-auto w-full max-w-[720px]">
          <ChatInput
            key={initial}
            defaultValue={initial}
            onSend={(content) => void start(content)}
            disabled={starting}
            placeholder="Ask anything…"
          />
        </div>
      </div>
    </div>
  );
}
