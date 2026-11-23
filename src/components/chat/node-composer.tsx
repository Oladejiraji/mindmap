"use client";

import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { handleError } from "@/lib/handle-error";
import { ChatInput, type ChatInputProps } from "./chat-input";

/**
 * The composer for a node's chat: sends into the node, and turns into
 * Stop while its reply is written. Everything else is ChatInput's.
 */
export function NodeComposer({
  nodeId,
  ...inputProps
}: { nodeId: Id<"nodes"> } & Omit<ChatInputProps, "onSend" | "busy" | "onStop">) {
  const { data: messages } = useAuthedConvexQuery(api.messages.listByNode, { nodeId });
  const sendMessage = useMutation(api.chat.send);
  const stopReply = useMutation(api.chat.stop);
  const isStreaming = messages?.some((m) => m.isStreaming) ?? false;

  // Resolves once the message is saved (the reply streams in after);
  // rejecting keeps the text in the box.
  const send = async (content: string) => {
    try {
      await sendMessage({ nodeId, content });
    } catch (err) {
      handleError(err, "Failed to send message");
      throw err;
    }
  };
  const stop = () => {
    stopReply({ nodeId }).catch((err) => handleError(err, "Couldn't stop the reply"));
  };

  return <ChatInput onSend={send} busy={isStreaming} onStop={stop} {...inputProps} />;
}
