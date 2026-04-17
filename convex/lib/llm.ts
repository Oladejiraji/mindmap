import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ChatMessage } from "./context";

const PATCH_INTERVAL_MS = 100;
const UNTITLED = "Untitled";

/**
 * Streams an assistant response for the given node:
 *   1. Reads the full prompt context (ancestor walk) via an internal query.
 *   2. Inserts an empty streaming assistant message (marks the node as streaming).
 *   3. Calls the LLM and patches the message content progressively.
 *   4. Finalizes the message when the stream completes.
 */
export async function streamAssistantResponse(
  ctx: ActionCtx,
  nodeId: Id<"nodes">,
): Promise<void> {
  const messages: ChatMessage[] = await ctx.runQuery(
    internal.chat.getContext,
    { nodeId },
  );

  const { messageId } = await ctx.runMutation(
    internal.messages.startAssistantMessage,
    { nodeId },
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    messages,
  });

  let buffer = "";
  let lastPatch = Date.now();

  for await (const chunk of result.textStream) {
    buffer += chunk;
    if (Date.now() - lastPatch >= PATCH_INTERVAL_MS) {
      await ctx.runMutation(internal.messages.patchStreamingContent, {
        messageId,
        content: buffer,
      });
      lastPatch = Date.now();
    }
  }

  await ctx.runMutation(internal.messages.finishStreamingMessage, {
    messageId,
    content: buffer,
  });
}

/**
 * Generates a concise node title from the user's first message, but only if
 * the node is still named "Untitled". Errors are swallowed so a title failure
 * never breaks the chat flow.
 */
export async function maybeGenerateTitle(
  ctx: ActionCtx,
  nodeId: Id<"nodes">,
  firstMessage: string,
): Promise<void> {
  try {
    const node = await ctx.runQuery(api.nodes.get, { nodeId });
    if (!node || node.title !== UNTITLED) return;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      prompt: `Write a concise 2-5 word title (Title Case, no quotes, no trailing punctuation) for a chat that starts with this user message:\n\n${firstMessage}`,
    });

    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    if (!title) return;

    await ctx.runMutation(api.nodes.rename, { nodeId, title });
  } catch (err) {
    console.error("title generation failed", err);
  }
}
