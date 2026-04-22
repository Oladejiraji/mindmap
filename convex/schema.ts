import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  threads: defineTable({
    userId: v.string(),
    name: v.string(),
  }).index("by_userId", ["userId"]),

  nodes: defineTable({
    userId: v.string(),
    threadId: v.id("threads"),
    parentId: v.union(v.id("nodes"), v.null()),
    branchedAt: v.optional(v.number()),
    title: v.string(),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      }),
    ),
    isStreaming: v.optional(v.boolean()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_parentId", ["parentId"])
    .index("by_userId_and_threadId", ["userId", "threadId"]),

  messages: defineTable({
    nodeId: v.id("nodes"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    index: v.number(),
    isStreaming: v.optional(v.boolean()),
  }).index("by_nodeId_and_index", ["nodeId", "index"]),
});
