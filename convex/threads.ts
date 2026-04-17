import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeTitle } from "./lib/validation";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("threads").order("desc").take(100);
  },
});

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = normalizeTitle(args.name, "Thread name");
    const threadId = await ctx.db.insert("threads", { name });
    const rootNodeId = await ctx.db.insert("nodes", {
      threadId,
      parentId: null,
      title: name,
    });
    return { threadId, rootNodeId };
  },
});

