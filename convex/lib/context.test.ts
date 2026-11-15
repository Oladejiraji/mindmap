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
    const current = system.indexOf('<current_node title="Per API call">\n$0.002 per call.\n</current_node>');
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
});
