import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { modules } from "./test.setup";
import type { DocumentEdit } from "./lib/document";

const NOT_FOUND = { data: { code: "NOT_FOUND" } };
const UNAUTHORIZED = { data: { code: "UNAUTHORIZED" } };
const OUT_OF_DATE = { data: { code: "OUT_OF_DATE" } };

const DOC = "# Pricing\n\nSeat-based.\n\nOpen questions.";

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const { nodeId, chatId } = await t.run(async (ctx) => {
    const threadId = await ctx.db.insert("threads", { userId: "alice", name: "Pricing" });
    const nodeId = await ctx.db.insert("nodes", {
      userId: "alice",
      threadId,
      parentId: null,
      title: "Pricing",
      content: DOC,
      contentVersion: 3,
    });
    const chatId = await ctx.db.insert("chats", { nodeId });
    return { nodeId, chatId };
  });

  /** An empty reply being written, as chat.send leaves it for the reply job. */
  let index = 0;
  const startReply = () =>
    t.run((ctx) =>
      ctx.db.insert("messages", { chatId, role: "assistant", content: "", index: index++, isStreaming: true }),
    );

  const alice = t.withIdentity({ subject: "alice" });

  /** An assistant reply that suggests the given edits, as the chat action records it. */
  const suggest = async (edits: DocumentEdit[], baseVersion = 3) => {
    const messageId = await startReply();
    await t.mutation(internal.messages.finishStreamingMessage, {
      messageId,
      content: "Reply",
      proposal: { baseVersion, reason: "Record the switch", edits },
    });
    const proposal = await t.run((ctx) =>
      ctx.db.query("proposals").withIndex("by_messageId", (q) => q.eq("messageId", messageId)).unique(),
    );
    return proposal!._id;
  };

  const node = () => t.run((ctx) => ctx.db.get(nodeId));
  const status = (id: Id<"proposals">) => t.run(async (ctx) => (await ctx.db.get(id))?.status);

  return { t, nodeId, startReply, alice, bob: t.withIdentity({ subject: "bob" }), suggest, node, status };
}

const SWITCH: DocumentEdit[] = [{ type: "replace", block: 2, markdown: "Usage-based." }];

describe("suggesting", () => {
  test("a reply's suggestion is listed with what would change", async () => {
    const { alice, nodeId, suggest } = await setup();
    const id = await suggest(SWITCH);
    expect(await alice.query(api.proposals.listByNode, { nodeId })).toMatchObject([
      {
        _id: id,
        reason: "Record the switch",
        state: "pending",
        changes: [{ type: "replace", before: "Seat-based.", after: "Usage-based." }],
      },
    ]);
  });

  test("a reply is marked while it writes an edit, and the mark clears when it finishes", async () => {
    const { t, startReply } = await setup();
    const messageId = await startReply();
    await t.mutation(internal.messages.startDraftingEdit, { messageId, content: "Reply" });
    expect(await t.run((ctx) => ctx.db.get(messageId))).toMatchObject({ content: "Reply", draftingEdit: true });

    await t.mutation(internal.messages.finishStreamingMessage, {
      messageId,
      content: "Reply",
      proposal: { baseVersion: 3, reason: "r", edits: SWITCH },
    });
    expect((await t.run((ctx) => ctx.db.get(messageId)))?.draftingEdit).toBeUndefined();
  });

  test("a new suggestion replaces the unanswered one", async () => {
    const { suggest, status } = await setup();
    const first = await suggest(SWITCH);
    const second = await suggest([{ type: "delete", block: 3 }]);
    expect(await status(first)).toBe("superseded");
    expect(await status(second)).toBe("pending");
  });

  test("a reply without a suggestion leaves the pending one alone", async () => {
    const { t, startReply, suggest, status } = await setup();
    const id = await suggest(SWITCH);
    const messageId = await startReply();
    await t.mutation(internal.messages.finishStreamingMessage, { messageId, content: "Just chatting" });
    expect(await status(id)).toBe("pending");
  });
});

describe("accept", () => {
  test("applies the edit, bumps the version and marks it accepted", async () => {
    const { alice, suggest, node, status } = await setup();
    const id = await suggest(SWITCH);
    await alice.mutation(api.proposals.accept, { proposalId: id });
    expect(await node()).toMatchObject({
      content: "# Pricing\n\nUsage-based.\n\nOpen questions.",
      contentVersion: 4,
    });
    expect(await status(id)).toBe("accepted");
  });

  test("is refused once the document changed, which shows it as out of date", async () => {
    const { alice, nodeId, suggest, node, status } = await setup();
    const id = await suggest(SWITCH);
    await alice.mutation(api.nodes.updateContent, { nodeId, content: "# Pricing\n\nRewritten by hand." });

    expect((await alice.query(api.proposals.listByNode, { nodeId }))[0]).toMatchObject({
      state: "out_of_date",
      changes: null,
    });
    await expect(alice.mutation(api.proposals.accept, { proposalId: id })).rejects.toMatchObject(OUT_OF_DATE);
    expect((await node())?.content).toBe("# Pricing\n\nRewritten by hand.");
    expect(await status(id)).toBe("pending");
  });

  test("can't be answered twice", async () => {
    const { alice, suggest } = await setup();
    const id = await suggest(SWITCH);
    await alice.mutation(api.proposals.reject, { proposalId: id });
    await expect(alice.mutation(api.proposals.accept, { proposalId: id })).rejects.toThrow();
    await expect(alice.mutation(api.proposals.reject, { proposalId: id })).rejects.toThrow();
  });

  test("a superseded suggestion can't be accepted", async () => {
    const { alice, suggest } = await setup();
    const first = await suggest(SWITCH);
    await suggest([{ type: "delete", block: 3 }]);
    await expect(alice.mutation(api.proposals.accept, { proposalId: first })).rejects.toThrow();
  });
});

describe("reject", () => {
  test("leaves the document alone", async () => {
    const { alice, suggest, node, status } = await setup();
    const id = await suggest(SWITCH);
    await alice.mutation(api.proposals.reject, { proposalId: id });
    expect(await node()).toMatchObject({ content: DOC, contentVersion: 3 });
    expect(await status(id)).toBe("rejected");
  });

  test("dismisses an out-of-date suggestion", async () => {
    const { alice, suggest, status } = await setup();
    const id = await suggest(SWITCH, 2);
    await alice.mutation(api.proposals.reject, { proposalId: id });
    expect(await status(id)).toBe("rejected");
  });
});

describe("ownership", () => {
  test("only the node's owner can list, accept or reject", async () => {
    const { t, bob, nodeId, suggest, node, status } = await setup();
    const id = await suggest(SWITCH);

    await expect(bob.query(api.proposals.listByNode, { nodeId })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.query(api.proposals.listByNode, { nodeId })).rejects.toMatchObject(UNAUTHORIZED);
    await expect(bob.mutation(api.proposals.accept, { proposalId: id })).rejects.toMatchObject(NOT_FOUND);
    await expect(bob.mutation(api.proposals.reject, { proposalId: id })).rejects.toMatchObject(NOT_FOUND);
    await expect(t.mutation(api.proposals.accept, { proposalId: id })).rejects.toMatchObject(UNAUTHORIZED);

    expect((await node())?.content).toBe(DOC);
    expect(await status(id)).toBe("pending");
  });
});

describe("node content", () => {
  test("every save bumps the version", async () => {
    const { alice, nodeId, node } = await setup();
    await alice.mutation(api.nodes.updateContent, { nodeId, content: "a" });
    await alice.mutation(api.nodes.updateContent, { nodeId, content: "" });
    const saved = await node();
    expect(saved?.content).toBeUndefined();
    expect(saved?.contentVersion).toBe(5);
  });

  test("deleting a node deletes its suggestions", async () => {
    const { t, alice, nodeId, suggest } = await setup();
    await suggest(SWITCH);
    await alice.mutation(api.nodes.deleteLeafNode, { nodeId });
    expect(await t.run((ctx) => ctx.db.query("proposals").collect())).toEqual([]);
  });
});
