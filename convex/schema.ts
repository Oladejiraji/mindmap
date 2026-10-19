import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const teamSizeValidator = v.union(
  v.literal("1-10"),
  v.literal("11-50"),
  v.literal("51-200"),
  v.literal("200+"),
);

export const jobRoleValidator = v.union(
  v.literal("product"),
  v.literal("design"),
  v.literal("engineering"),
  v.literal("research"),
  v.literal("leadership"),
  v.literal("other"),
);

export const useCaseValidator = v.union(
  v.literal("research"),
  v.literal("strategy"),
  v.literal("product-discovery"),
  v.literal("learning"),
  v.literal("planning"),
  v.literal("other"),
);

export const orgRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

export const invitationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    onboardedAt: v.optional(v.number()),
    jobRole: v.optional(jobRoleValidator),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  organizations: defineTable({
    name: v.string(),
    teamSize: v.optional(teamSizeValidator),
    useCases: v.array(useCaseValidator),
    createdBy: v.string(),
  }).index("by_createdBy", ["createdBy"]),

  memberships: defineTable({
    userId: v.string(),
    orgId: v.id("organizations"),
    role: orgRoleValidator,
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"])
    .index("by_userId_orgId", ["userId", "orgId"]),

  invitations: defineTable({
    email: v.string(),
    orgId: v.id("organizations"),
    invitedBy: v.string(),
    role: orgRoleValidator,
    status: invitationStatusValidator,
    expiresAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_orgId", ["orgId"])
    .index("by_email_orgId", ["email", "orgId"]),

  threads: defineTable({
    userId: v.string(),
    name: v.string(),
    updatedAt: v.optional(v.number()),
    orgId: v.optional(v.id("organizations")),
  }).index("by_userId", ["userId"]),

  nodes: defineTable({
    userId: v.string(),
    threadId: v.id("threads"),
    parentId: v.union(v.id("nodes"), v.null()),
    title: v.string(),
    content: v.optional(v.any()),
    summary: v.optional(v.string()),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      }),
    ),
  })
    .index("by_threadId", ["threadId"])
    .index("by_parentId", ["parentId"])
    .index("by_userId_and_threadId", ["userId", "threadId"]),

  chats: defineTable({
    nodeId: v.id("nodes"),
    isStreaming: v.optional(v.boolean()),
  }).index("by_nodeId", ["nodeId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    index: v.number(),
    isStreaming: v.optional(v.boolean()),
  }).index("by_chatId_and_index", ["chatId", "index"]),
});
