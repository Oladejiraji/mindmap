import { v } from "convex/values";
import { userMutation, userQuery } from "./lib/functions";
import { orgRoleValidator } from "./schema";

export const list = userQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", args.orgId),
      )
      .first();
    if (!mine) throw new Error("Not found");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(200);

    const results = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_tokenIdentifier", (q) =>
            q.eq("tokenIdentifier", m.userId),
          )
          .unique();
        return {
          _id: m._id,
          role: m.role,
          userId: m.userId,
          name: user?.name ?? null,
          email: user?.email ?? null,
        };
      }),
    );

    return results;
  },
});

export const updateRole = userMutation({
  args: {
    membershipId: v.id("memberships"),
    role: orgRoleValidator,
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.membershipId);
    if (!target) throw new Error("Not found");

    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", target.orgId),
      )
      .first();
    if (!mine || mine.role !== "owner") {
      throw new Error("Only owners can change roles");
    }

    if (target.userId === ctx.userId) {
      throw new Error("Cannot change your own role");
    }

    await ctx.db.patch(args.membershipId, { role: args.role });
    return null;
  },
});

export const remove = userMutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.membershipId);
    if (!target) throw new Error("Not found");

    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", target.orgId),
      )
      .first();
    if (!mine) throw new Error("Not found");

    const removingSelf = target.userId === ctx.userId;

    if (!removingSelf && mine.role !== "owner") {
      throw new Error("Only owners can remove members");
    }

    if (removingSelf && mine.role === "owner") {
      const otherOwners = await ctx.db
        .query("memberships")
        .withIndex("by_orgId", (q) => q.eq("orgId", target.orgId))
        .take(200);
      const hasOtherOwner = otherOwners.some(
        (m) => m.role === "owner" && m.userId !== ctx.userId,
      );
      if (!hasOtherOwner) {
        throw new Error("Cannot leave — you are the only owner");
      }
    }

    await ctx.db.delete(args.membershipId);
    return null;
  },
});
