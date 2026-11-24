import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import type { Id } from "../_generated/dataModel";
import { modules } from "../test.setup";
import { buildPromptContext, toModelInput, type PromptContext } from "./context";

const paragraph = (t: string) => t;

/**
 * Pricing (root)
 * ├── Usage-based          ← no content
 * │   └── Per API call     ← the node we chat in
 * └── Flat fee             ← sibling, must never leak
 */
async function setupTree() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const threadId = await ctx.db.insert("threads", { userId: "u1", name: "Pricing" });
    const node = (parentId: Id<"nodes"> | null, title: string, content?: string) =>
      ctx.db.insert("nodes", { userId: "u1", threadId, parentId, title, content });

    const root = await node(null, "Pricing", paragraph("We sell to small teams."));
    const usage = await node(root, "Usage-based");
    const flat = await node(root, "Flat fee", paragraph("SECRET sibling text"));
    const leaf = await node(usage, "Per API call", paragraph("$0.002 per call."));
    return { root, usage, flat, leaf };
  });
  return { t, ...ids };
}

const build = (t: Awaited<ReturnType<typeof setupTree>>["t"], nodeId: Id<"nodes">) =>
  t.run((ctx) => buildPromptContext(ctx, nodeId));

describe("buildPromptContext", () => {
  test("gathers the ancestor path root first, then the current node", async () => {
    const { t, root, usage, leaf } = await setupTree();
    const context = await build(t, leaf);

    expect(context?.ancestors.map((n) => n.nodeId)).toEqual([root, usage]);
    expect(context?.ancestors.map((n) => n.title)).toEqual(["Pricing", "Usage-based"]);
    expect(context?.current).toEqual({ nodeId: leaf, title: "Per API call", markdown: "$0.002 per call." });
  });

  test("never includes siblings or their content", async () => {
    const { t, flat, leaf } = await setupTree();
    const context = await build(t, leaf);

    expect(context?.ancestors.some((n) => n.nodeId === flat)).toBe(false);
    expect(JSON.stringify(context)).not.toContain("SECRET");
  });

  test("keeps ancestors with no content, by title", async () => {
    const { t, leaf } = await setupTree();
    const context = await build(t, leaf);

    expect(context?.ancestors[1]).toMatchObject({ title: "Usage-based", markdown: "" });
  });

  test("a root node has no ancestors", async () => {
    const { t, root } = await setupTree();
    const context = await build(t, root);

    expect(context?.ancestors).toEqual([]);
    expect(context?.current.title).toBe("Pricing");
  });

  test("includes only this node's chat, oldest first", async () => {
    const { t, usage, leaf } = await setupTree();
    await t.run(async (ctx) => {
      const leafChat = await ctx.db.insert("chats", { nodeId: leaf });
      // Inserted out of order: the index decides the order, not insertion time.
      await ctx.db.insert("messages", { chatId: leafChat, role: "assistant", content: "Second", index: 1 });
      await ctx.db.insert("messages", { chatId: leafChat, role: "user", content: "First", index: 0 });

      const parentChat = await ctx.db.insert("chats", { nodeId: usage });
      await ctx.db.insert("messages", { chatId: parentChat, role: "user", content: "Parent chat", index: 0 });
    });

    const context = await build(t, leaf);
    expect(context?.messages).toEqual([
      { role: "user", content: "First" },
      { role: "assistant", content: "Second" },
    ]);
  });

  test("attaches each suggested edit to its reply, out of date once the document moved on", async () => {
    const { t, leaf } = await setupTree();
    await t.run(async (ctx) => {
      await ctx.db.patch(leaf, { contentVersion: 2 });
      const chatId = await ctx.db.insert("chats", { nodeId: leaf });
      const edits = [{ type: "delete" as const, block: 1 }];
      const reply = (index: number) =>
        ctx.db.insert("messages", { chatId, role: "assistant", content: `r${index}`, index });
      const add = async (index: number, baseVersion: number, status: "pending" | "rejected") =>
        ctx.db.insert("proposals", { nodeId: leaf, messageId: await reply(index), baseVersion, reason: `p${index}`, edits, status });
      await add(0, 1, "rejected");
      await add(1, 1, "pending");
      await add(2, 2, "pending");
      await reply(3);
    });

    const context = await build(t, leaf);
    expect(context?.contentVersion).toBe(2);
    expect(context?.messages.map((m) => m.proposal?.state)).toEqual(["rejected", "out_of_date", "pending", undefined]);
  });

  test("leaves out the reply being written, failed replies and empty ones, but keeps stopped ones", async () => {
    const { t, leaf } = await setupTree();
    await t.run(async (ctx) => {
      const chatId = await ctx.db.insert("chats", { nodeId: leaf });
      const add = (index: number, role: "user" | "assistant", content: string, extra = {}) =>
        ctx.db.insert("messages", { chatId, role, content, index, ...extra });
      await add(0, "user", "Q1");
      await add(1, "assistant", "Half an ans", { interrupted: "failed" });
      await add(2, "user", "Q2");
      await add(3, "assistant", "Cut sh", { interrupted: "stopped" });
      await add(4, "user", "Q3");
      await add(5, "assistant", "", { interrupted: "stopped" });
      await add(6, "user", "Q4");
      await add(7, "assistant", "Writing", { isStreaming: true });
    });

    const context = await build(t, leaf);
    expect(context?.messages.map((m) => m.content)).toEqual(["Q1", "Q2", "Cut sh", "Q3", "Q4"]);
  });

  test("with an edit waiting, includes the document as a draft with it applied", async () => {
    const { t, leaf } = await setupTree();
    await t.run(async (ctx) => {
      const chatId = await ctx.db.insert("chats", { nodeId: leaf });
      const messageId = await ctx.db.insert("messages", { chatId, role: "assistant", content: "r", index: 0 });
      await ctx.db.insert("proposals", {
        nodeId: leaf,
        messageId,
        baseVersion: 0,
        reason: "Adds a budget",
        edits: [{ type: "insert", after: 1, markdown: "Budget: $500." }],
        status: "pending",
      });
    });
    expect((await build(t, leaf))?.draft).toEqual({ markdown: "$0.002 per call.\n\nBudget: $500.", reason: "Adds a budget" });

    // Out of date (the document moved on): no draft.
    await t.run((ctx) => ctx.db.patch(leaf, { contentVersion: 2 }));
    expect((await build(t, leaf))?.draft).toBeUndefined();
  });

  test("a node without a chat has no messages", async () => {
    const { t, leaf } = await setupTree();
    expect((await build(t, leaf))?.messages).toEqual([]);
  });

  test("returns null for a node that no longer exists", async () => {
    const { t, leaf } = await setupTree();
    await t.run((ctx) => ctx.db.delete(leaf));
    expect(await build(t, leaf)).toBeNull();
  });
});

describe("toModelInput", () => {
  const nodeId = "n" as Id<"nodes">;
  const context = (overrides: Partial<PromptContext> = {}): PromptContext => ({
    ancestors: [
      { nodeId, title: "Pricing", markdown: "Small teams." },
      { nodeId, title: "Tiers", markdown: "Three tiers." },
      { nodeId, title: "Usage-based", markdown: "" },
    ],
    current: { nodeId, title: "Per API call", markdown: "$0.002 per call." },
    contentVersion: 0,
    messages: [{ role: "user", content: "Too cheap?" }],
    ...overrides,
  });

  test("labels ancestors root, ancestor and parent, in order", () => {
    const { system } = toModelInput(context());
    const relations = [...system.matchAll(/<node relation="(\w+)" title="([^"]+)">/g)].map((m) => [m[1], m[2]]);
    expect(relations).toEqual([
      ["root", "Pricing"],
      ["ancestor", "Tiers"],
      ["parent", "Usage-based"],
    ]);
  });

  test("a single ancestor is labelled parent", () => {
    const { system } = toModelInput(context({ ancestors: [{ nodeId, title: "Pricing", markdown: "x" }] }));
    expect(system).toContain('<node relation="parent" title="Pricing">');
  });

  test("puts the instructions first, then ancestors, then the current node", () => {
    const { system } = toModelInput(context());
    const instructions = system.indexOf("You are a research assistant");
    // The instructions mention <ancestors> too; the section tag sits on its own line.
    const ancestors = system.indexOf("\n<ancestors>\n");
    const current = system.indexOf('<current_node title="Per API call">\n<block n="1">\n$0.002 per call.\n</block>\n</current_node>');
    expect(instructions).toBe(0);
    expect(ancestors).toBeGreaterThan(instructions);
    expect(current).toBeGreaterThan(ancestors);
  });

  test("empty content is marked (empty)", () => {
    const { system } = toModelInput(context());
    expect(system).toContain('<node relation="parent" title="Usage-based">\n(empty)\n</node>');
  });

  test("leaves out the ancestors section for a root node", () => {
    const { system } = toModelInput(context({ ancestors: [] }));
    expect(system).not.toContain("\n<ancestors>\n");
    expect(system).toContain("\n<current_node");
  });

  test("escapes titles so they can't break the tags", () => {
    const { system } = toModelInput(
      context({ current: { nodeId, title: 'Per "API" <call> & more', markdown: "x" } }),
    );
    expect(system).toContain('<current_node title="Per &quot;API&quot; &lt;call&gt; &amp; more">');
  });

  test("messages carry only the chat turns", () => {
    const { messages } = toModelInput(context());
    expect(messages).toEqual([{ role: "user", content: "Too cheap?" }]);
  });

  test("numbers the current node's blocks, but not the ancestors'", () => {
    const { system } = toModelInput(
      context({ current: { nodeId, title: "Per API call", markdown: "# Price\n\n- a\n- b" } }),
    );
    expect(system).toContain('<block n="1">\n# Price\n</block>\n<block n="2">\n- a\n- b\n</block>');
    expect(system).toContain('<node relation="root" title="Pricing">\nSmall teams.\n</node>');
  });

  test("an empty current node has no blocks", () => {
    const { system } = toModelInput(context({ current: { nodeId, title: "New", markdown: "" } }));
    expect(system).toContain('<current_node title="New">\n(empty)\n</current_node>');
  });

  test("asks for a first version of the document only when it's empty", () => {
    const empty = toModelInput(context({ current: { nodeId, title: "New", markdown: "" } })).system;
    const written = toModelInput(context()).system;
    expect(empty).toContain("The document in <current_node> is empty");
    expect(empty.indexOf("is empty")).toBeGreaterThan(empty.indexOf("</current_node>"));
    expect(written).not.toContain("The document in <current_node> is empty");
  });

  test("joins back-to-back turns from the same side, so turns alternate", () => {
    const { messages } = toModelInput(
      context({
        messages: [
          { role: "user", content: "Q1" },
          { role: "user", content: "Q2" },
          { role: "assistant", content: "A" },
          { role: "user", content: "Q3" },
          { role: "user", content: "Q4" },
        ],
      }),
    );
    expect(messages).toEqual([
      { role: "user", content: "Q1\n\nQ2" },
      { role: "assistant", content: "A" },
      { role: "user", content: "Q3\n\nQ4" },
    ]);
  });

  test("notes what became of a suggested edit at the end of its reply", () => {
    const { messages } = toModelInput(
      context({
        messages: [
          { role: "user", content: "Switch to usage?" },
          { role: "assistant", content: "Yes.", proposal: { reason: "Record the switch", state: "rejected" } },
          { role: "user", content: "Try again" },
          { role: "assistant", content: "Again.", proposal: { reason: "Retry", state: "out_of_date" } },
        ],
      }),
    );
    expect(messages[1].content).toBe('Yes.\n\n<document_edit outcome="rejected">Record the switch</document_edit>');
    expect(messages[3].content).toContain('outcome="out of date: the document changed before the user answered"');
  });

  test("with an edit waiting, shows and numbers the draft, and says so", () => {
    const { system } = toModelInput(
      context({ draft: { markdown: "$0.002 per call.\n\nBudget: $500.", reason: "Adds a budget" } }),
    );
    expect(system).toContain('<block n="2">\nBudget: $500.\n</block>');
    expect(system).toContain('<waiting_edit reason="Adds a budget" />');
  });

  test("without an edit waiting, has no waiting edit section", () => {
    expect(toModelInput(context()).system).not.toContain("<waiting_edit");
  });
});
