import { v } from "convex/values";
import { userMutation, userQuery } from "./lib/functions";
import { teamSizeValidator, jobRoleValidator, useCaseValidator } from "./schema";

export const createWithOnboarding = userMutation({
  args: {
    name: v.string(),
    teamSize: v.optional(teamSizeValidator),
    useCases: v.array(useCaseValidator),
    jobRole: v.optional(jobRoleValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const orgId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      teamSize: args.teamSize,
      useCases: args.useCases,
      createdBy: ctx.userId,
    });

    await ctx.db.insert("memberships", {
      userId: ctx.userId,
      orgId,
      role: "owner",
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      onboardedAt: Date.now(),
      jobRole: args.jobRole ?? undefined,
    });

    return { orgId };
  },
});

export const update = userMutation({
  args: {
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    teamSize: v.optional(teamSizeValidator),
    useCases: v.optional(v.array(useCaseValidator)),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", args.orgId),
      )
      .first();
    if (!membership || membership.role === "member") {
      throw new Error("Not found");
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.teamSize !== undefined) patch.teamSize = args.teamSize;
    if (args.useCases !== undefined) patch.useCases = args.useCases;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.orgId, patch);
    }
    return null;
  },
});

export const current = userQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .first();

    const org = membership ? await ctx.db.get(membership.orgId) : null;

    return {
      user: { onboardedAt: user.onboardedAt, jobRole: user.jobRole },
      org,
      membership: membership
        ? { _id: membership._id, role: membership.role }
        : null,
    };
  },
});

export const completeOnboarding = userMutation({
  args: {
    jobRole: v.optional(jobRoleValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      onboardedAt: Date.now(),
      jobRole: args.jobRole ?? undefined,
    });
    return null;
  },
});

export const updateJobRole = userMutation({
  args: { jobRole: jobRoleValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { jobRole: args.jobRole });
    return null;
  },
});
