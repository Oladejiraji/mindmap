import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { contentToMarkdown } from "./lib/blocks";

/**
 * One-off: node content moves from BlockNote JSON to markdown strings.
 * Converts in batches, scheduling itself until every node is done.
 * Run with: npx convex run migrations:nodeContentToMarkdown
 * Delete this file (and convex/lib/blocks.ts) once it has run everywhere.
 */
export const nodeContentToMarkdown = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), converted: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("nodes")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let converted = args.converted ?? 0;
    for (const node of page.page) {
      if (node.content === undefined || typeof node.content === "string") continue;
      const markdown = contentToMarkdown(node.content);
      await ctx.db.patch(node._id, { content: markdown || undefined });
      converted++;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.nodeContentToMarkdown, {
        cursor: page.continueCursor,
        converted,
      });
      return null;
    }
    console.log(`nodeContentToMarkdown: converted ${converted} nodes`);
    return null;
  },
});
