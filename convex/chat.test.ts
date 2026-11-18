import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { modules } from "./test.setup";

/*
 * The model is a stand-in, so these run the real reply job (stream, save,
 * close) without calling Anthropic. `model` is what the next call gets.
 */
let model: MockLanguageModelV3;
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => model }));

/** What a model's stream carries (the provider package isn't a direct dependency). */
type StreamPart =
  Awaited<ReturnType<MockLanguageModelV3["doStream"]>>["stream"] extends ReadableStream<infer P> ? P : never;

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

/** A model that streams `words`, `delayMs` apart, and names chats "Pricing Strategy". */
function replying(words: string[], delayMs = 0) {
  const chunks: StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t" },
    ...words.map((w) => ({ type: "text-delta" as const, id: "t", delta: w })),
    { type: "text-end", id: "t" },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
  ];
  return new MockLanguageModelV3({
    // Without a delay, a plain stream: simulateReadableStream waits on
    // timers, which are fake in most of these tests.
    doStream: async () => ({
      stream: delayMs
        ? simulateReadableStream({ chunks, chunkDelayInMs: delayMs })
        : new ReadableStream({
            start(controller) {
              for (const chunk of chunks) controller.enqueue(chunk);
              controller.close();
            },
          }),
    }),
    doGenerate: async () => ({
      content: [{ type: "text", text: "Pricing Strategy" }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

const failing = () =>
  new MockLanguageModelV3({
    doStream: async () => {
      throw new Error("Overloaded");
    },
  });

const NOT_FOUND = { data: { code: "NOT_FOUND" } };
const UNAUTHORIZED = { data: { code: "UNAUTHORIZED" } };
const IN_PROGRESS = { data: { code: "REPLY_IN_PROGRESS" } };
const NOTHING_TO_RETRY = { data: { code: "NOTHING_TO_RETRY" } };

async function setup({ title = "Untitled" } = {}) {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const nodeId = await t.run(async (ctx) => {
    const threadId = await ctx.db.insert("threads", { userId: "alice", name: title });
    return await ctx.db.insert("nodes", { userId: "alice", threadId, parentId: null, title });
  });
  const messages = () =>
    t.run(async (ctx) => {
      const chat = await ctx.db.query("chats").withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId)).first();
      if (!chat) return [];
      return await ctx.db.query("messages").withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id)).collect();
    });
  /** Runs the reply job send or retry scheduled (not the timeout, minutes later). */
  const runReply = async () => {
    vi.advanceTimersByTime(1);
    await t.finishInProgressScheduledFunctions();
  };
  return { t, nodeId, messages, runReply, alice: t.withIdentity({ subject: "alice" }), bob: t.withIdentity({ subject: "bob" }) };
}

// Scheduled functions run on timers: fake ones keep the reply job from
// starting until a test runs it.
afterEach(() => {
  vi.useRealTimers();
});

describe("send", () => {
  test("saves the message and an empty reply right away, then the reply is written", async () => {
    vi.useFakeTimers();
    model = replying(["Start ", "with ", "costs."]);
    const { alice, nodeId, messages, runReply, t } = await setup();

    await alice.mutation(api.chat.send, { nodeId, content: "  How should we price?  " });
    expect(await messages()).toMatchObject([
      { role: "user", content: "How should we price?", index: 0 },
      { role: "assistant", content: "", index: 1, isStreaming: true },
    ]);

    await runReply();
    const [, reply] = await messages();
    expect(reply).toMatchObject({ content: "Start with costs.", isStreaming: false });
    expect(reply.interrupted).toBeUndefined();
    // The first message names the untitled node, and the project with it.
    const node = await t.run((ctx) => ctx.db.get(nodeId));
    expect(node?.title).toBe("Pricing Strategy");
    expect((await t.run((ctx) => ctx.db.get(node!.threadId)))?.name).toBe("Pricing Strategy");
  });

  test("leaves a named node's title alone", async () => {
    vi.useFakeTimers();
    model = replying(["Sure."]);
    const { alice, nodeId, runReply, t } = await setup({ title: "Pricing" });
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    await runReply();
    expect((await t.run((ctx) => ctx.db.get(nodeId)))?.title).toBe("Pricing");
  });

  test("is refused while a reply is being written, and saves nothing", async () => {
    vi.useFakeTimers();
    const { alice, nodeId, messages } = await setup();
    await alice.mutation(api.chat.send, { nodeId, content: "First" });
    await expect(alice.mutation(api.chat.send, { nodeId, content: "Second" })).rejects.toMatchObject(IN_PROGRESS);
    expect(await messages()).toHaveLength(2);
  });

  test("only the node's owner can send, retry or stop", async () => {
    vi.useFakeTimers();
    const { t, bob, nodeId, messages } = await setup();
    await expect(bob.mutation(api.chat.send, { nodeId, content: "Hi" })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.chat.send, { nodeId, content: "Hi" })).rejects.toMatchObject(UNAUTHORIZED);
    await expect(bob.mutation(api.chat.retry, { nodeId })).rejects.toMatchObject(NOT_FOUND);
    await expect(bob.mutation(api.chat.stop, { nodeId })).rejects.toMatchObject(NOT_FOUND);
    expect(await messages()).toEqual([]);
  });
});

describe("a failed reply", () => {
  test("is marked failed, and retry writes a new reply after it", async () => {
    vi.useFakeTimers();
    model = failing();
    const { alice, nodeId, messages, runReply } = await setup({ title: "Pricing" });
    await alice.mutation(api.chat.send, { nodeId, content: "How should we price?" });
    await runReply();
    expect((await messages())[1]).toMatchObject({ content: "", isStreaming: false, interrupted: "failed" });

    model = replying(["Start ", "with ", "costs."]);
    await alice.mutation(api.chat.retry, { nodeId });
    await runReply();
    expect(await messages()).toMatchObject([
      { role: "user" },
      { role: "assistant", interrupted: "failed" },
      { role: "assistant", content: "Start with costs.", isStreaming: false },
    ]);
    // The retry read the question once, and not the failed reply.
    const prompt = model.doStreamCalls[0].prompt.filter((m) => m.role !== "system");
    expect(prompt).toMatchObject([{ role: "user", content: [{ type: "text", text: "How should we price?" }] }]);
  });

  test("retry is refused unless the last reply failed", async () => {
    vi.useFakeTimers();
    model = replying(["Fine."]);
    const { alice, nodeId, runReply } = await setup({ title: "Pricing" });
    await expect(alice.mutation(api.chat.retry, { nodeId })).rejects.toMatchObject(NOTHING_TO_RETRY);
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    await expect(alice.mutation(api.chat.retry, { nodeId })).rejects.toMatchObject(IN_PROGRESS);
    await runReply();
    await expect(alice.mutation(api.chat.retry, { nodeId })).rejects.toMatchObject(NOTHING_TO_RETRY);
  });

  test("a reply the job never closed fails at the timeout, freeing the chat", async () => {
    vi.useFakeTimers();
    const { t, alice, nodeId, messages } = await setup({ title: "Pricing" });
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    const [, reply] = await messages();
    await t.mutation(internal.messages.expireReply, { messageId: reply._id });
    expect((await messages())[1]).toMatchObject({ isStreaming: false, interrupted: "failed" });
    await expect(alice.mutation(api.chat.send, { nodeId, content: "Again" })).resolves.toBeNull();
  });
});

describe("stop", () => {
  test("closes the reply at once; the job then cancels the model and leaves it", async () => {
    vi.useFakeTimers();
    const { t, alice, nodeId, messages } = await setup({ title: "Pricing" });
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    const [, reply] = await messages();
    await t.mutation(internal.messages.patchStreamingContent, { messageId: reply._id, content: "Start with" });

    await alice.mutation(api.chat.stop, { nodeId });
    expect((await messages())[1]).toMatchObject({ content: "Start with", isStreaming: false, interrupted: "stopped" });

    // The job, still streaming, finds the reply closed on its next save.
    vi.useRealTimers();
    model = replying(["a ", "very ", "long ", "reply ", "indeed"], 60);
    await t.action(internal.chat.respond, { nodeId, messageId: reply._id });
    expect((await messages())[1]).toMatchObject({ content: "Start with", interrupted: "stopped" });
    expect(model.doStreamCalls[0].abortSignal?.aborted).toBe(true);
  });

  test("a stopped reply stays in what the AI reads, and the chat takes the next message", async () => {
    vi.useFakeTimers();
    const { t, alice, nodeId, messages, runReply } = await setup({ title: "Pricing" });
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    const [, reply] = await messages();
    await t.mutation(internal.messages.patchStreamingContent, { messageId: reply._id, content: "Hello th" });
    await alice.mutation(api.chat.stop, { nodeId });

    model = replying(["Sure."]);
    await alice.mutation(api.chat.send, { nodeId, content: "Go on" });
    await runReply();
    const prompt = model.doStreamCalls[0].prompt.filter((m) => m.role !== "system");
    expect(prompt.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  test("does nothing when no reply is being written", async () => {
    const { alice, nodeId } = await setup();
    await expect(alice.mutation(api.chat.stop, { nodeId })).resolves.toBeNull();
  });
});

describe("the project's reply count (its tab's spinner)", () => {
  test("goes up while a reply is written and back to 0 however it ends", async () => {
    vi.useFakeTimers();
    const { t, alice, nodeId, messages, runReply } = await setup({ title: "Pricing" });
    const replyingNow = async () => {
      const node = await t.run((ctx) => ctx.db.get(nodeId));
      return (await t.run((ctx) => ctx.db.get(node!.threadId)))?.replying ?? 0;
    };

    // Finished
    model = replying(["Sure."]);
    await alice.mutation(api.chat.send, { nodeId, content: "Hi" });
    expect(await replyingNow()).toBe(1);
    await runReply();
    expect(await replyingNow()).toBe(0);

    // Failed, then retried
    model = failing();
    await alice.mutation(api.chat.send, { nodeId, content: "Again" });
    await runReply();
    expect(await replyingNow()).toBe(0);

    // Stopped: the job finding it closed doesn't count it down twice
    await alice.mutation(api.chat.retry, { nodeId });
    await alice.mutation(api.chat.stop, { nodeId });
    expect(await replyingNow()).toBe(0);
    model = replying(["Late."]);
    await runReply();
    expect(await replyingNow()).toBe(0);

    // Timed out
    await alice.mutation(api.chat.send, { nodeId, content: "Once more" });
    const reply = (await messages()).at(-1)!;
    await t.mutation(internal.messages.expireReply, { messageId: reply._id });
    expect(await replyingNow()).toBe(0);
  });
});
