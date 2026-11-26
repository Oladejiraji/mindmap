import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { DEMO_PROJECTS, PRICING_PROJECT, RECORDING_PROJECT, type SeedNode } from "./lib/demoSeed";
import { deleteTabsFor, openTab } from "./lib/tabs";
import { deleteViewsFor } from "./lib/projectViews";
import { deleteNodeAndChat } from "./nodes";

/*
 * Demo data for a user's account: projects with node trees, documents and
 * chats. Internal only.
 *   npx convex run seed:demo '{"email":"someone@example.com"}'
 *   npx convex run seed:clearDemo '{"email":"someone@example.com"}'
 *   npx convex run seed:recording '{"email":"someone@example.com"}'
 *   npx convex run seed:recording '{"email":"someone@example.com","project":"pricing"}'
 *   npx convex run seed:clearRecording '{"email":"someone@example.com","project":"pricing"}'
 */

const RECORDINGS = { japan: RECORDING_PROJECT, pricing: PRICING_PROJECT };

async function userIdFor(ctx: MutationCtx, email: string): Promise<string> {
  // Small table; there's no index on email.
  const users = await ctx.db.query("users").take(1000);
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No user with email ${email}`);
  // Ownership uses the identity's subject, the last part of the token identifier.
  return user.tokenIdentifier.split("|").at(-1)!;
}

async function insertNode(
  ctx: MutationCtx,
  userId: string,
  threadId: Id<"threads">,
  parentId: Id<"nodes"> | null,
  node: SeedNode,
): Promise<number> {
  const nodeId = await ctx.db.insert("nodes", {
    userId,
    threadId,
    parentId,
    title: node.title,
    content: node.content,
    contentVersion: node.content ? 1 : undefined,
  });
  if (node.chat?.length) {
    const chatId = await ctx.db.insert("chats", { nodeId, isStreaming: false });
    let index = 0;
    for (const [user, assistant] of node.chat) {
      await ctx.db.insert("messages", { chatId, role: "user", content: user, index: index++ });
      await ctx.db.insert("messages", { chatId, role: "assistant", content: assistant, index: index++ });
    }
  }
  let count = 1;
  for (const child of node.children ?? []) count += await insertNode(ctx, userId, threadId, nodeId, child);
  return count;
}

export const demo = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await userIdFor(ctx, args.email);
    const now = Date.now();
    let nodes = 0;
    // Oldest first, so the first project is the most recently updated.
    for (const [i, project] of [...DEMO_PROJECTS].reverse().entries()) {
      const threadId = await ctx.db.insert("threads", {
        userId,
        name: project.title,
        updatedAt: now - (DEMO_PROJECTS.length - i) * 3_600_000,
      });
      nodes += await insertNode(ctx, userId, threadId, null, project);
    }
    // Open them as tabs, newest first.
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(DEMO_PROJECTS.length);
    for (const thread of threads) await openTab(ctx, userId, thread._id);
    return { projects: DEMO_PROJECTS.length, nodes };
  },
});

/** Removes the demo projects (matched by name) and everything in them. */
export const clearDemo = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await userIdFor(ctx, args.email);
    const names = new Set(DEMO_PROJECTS.map((p) => p.title));
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    let removed = 0;
    for (const thread of threads.filter((t) => names.has(t.name))) {
      const nodes = await ctx.db
        .query("nodes")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .take(500);
      for (const node of nodes) {
        const chats = await ctx.db.query("chats").withIndex("by_nodeId", (q) => q.eq("nodeId", node._id)).take(10);
        for (const chat of chats) {
          const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
            .take(500);
          for (const m of messages) await ctx.db.delete(m._id);
          await ctx.db.delete(chat._id);
        }
        await ctx.db.delete(node._id);
      }
      await deleteTabsFor(ctx, thread._id);
      await ctx.db.delete(thread._id);
      removed++;
    }
    return { removed };
  },
});

/** Adds a project for recording (the Japan trip by default), opened as a tab. */
export const recording = internalMutation({
  args: { email: v.string(), project: v.optional(v.union(v.literal("japan"), v.literal("pricing"))) },
  handler: async (ctx, args) => {
    const userId = await userIdFor(ctx, args.email);
    const project = RECORDINGS[args.project ?? "japan"];
    const threadId = await ctx.db.insert("threads", {
      userId,
      name: project.title,
      updatedAt: Date.now(),
    });
    await insertNode(ctx, userId, threadId, null, project);
    await openTab(ctx, userId, threadId);
    return { threadId };
  },
});

/** Removes a recording project (matched by name) and everything in it. */
export const clearRecording = internalMutation({
  args: { email: v.string(), project: v.optional(v.union(v.literal("japan"), v.literal("pricing"))) },
  handler: async (ctx, args) => {
    const userId = await userIdFor(ctx, args.email);
    const name = RECORDINGS[args.project ?? "japan"].title;
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    let removed = 0;
    for (const thread of threads.filter((t) => t.name === name)) {
      const nodes = await ctx.db
        .query("nodes")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .take(500);
      for (const node of nodes) await deleteNodeAndChat(ctx, node._id);
      await deleteTabsFor(ctx, thread._id);
      await deleteViewsFor(ctx, thread._id);
      await ctx.db.delete(thread._id);
      removed++;
    }
    return { removed };
  },
});
