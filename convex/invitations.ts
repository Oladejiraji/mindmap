import { v } from "convex/values";
import { userMutation, userQuery } from "./lib/functions";
import { orgRoleValidator } from "./schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const create = userMutation({
  args: {
    email: v.string(),
    orgId: v.id("organizations"),
    role: v.optional(orgRoleValidator),
  },
  handler: async (ctx, args) => {
    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", args.orgId),
      )
      .first();
    if (!mine || mine.role === "member") {
      throw new Error("Only owners and admins can invite");
    }

    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email_orgId", (q) =>
        q.eq("email", args.email).eq("orgId", args.orgId),
      )
      .first();
    if (existing && existing.status === "pending") {
      throw new Error("Invitation already pending for this email");
    }

    const invitationId = await ctx.db.insert("invitations", {
      email: args.email.toLowerCase().trim(),
      orgId: args.orgId,
      invitedBy: ctx.userId,
      role: args.role ?? "member",
      status: "pending",
      expiresAt: Date.now() + INVITE_TTL_MS,
    });

    return { invitationId };
  },
});

export const listForOrg = userQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", args.orgId),
      )
      .first();
    if (!mine) throw new Error("Not found");

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .take(200);

    return invitations.filter((inv) => inv.status === "pending");
  },
});

export const pending = userQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user?.email) return [];

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
      .take(50);

    const now = Date.now();
    const results = await Promise.all(
      invitations
        .filter((inv) => inv.status === "pending" && inv.expiresAt > now)
        .map(async (inv) => {
          const org = await ctx.db.get(inv.orgId);
          return {
            _id: inv._id,
            orgId: inv.orgId,
            orgName: org?.name ?? "Unknown",
            role: inv.role,
            expiresAt: inv.expiresAt,
          };
        }),
    );

    return results;
  },
});

export const accept = userMutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invitation not found or already used");
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(args.invitationId, { status: "declined" });
      throw new Error("Invitation has expired");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user?.email || user.email.toLowerCase() !== invitation.email) {
      throw new Error("This invitation is not for your email");
    }

    const org = await ctx.db.get(invitation.orgId);
    if (!org) {
      await ctx.db.patch(args.invitationId, { status: "declined" });
      throw new Error("Organization no longer exists");
    }

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", invitation.orgId),
      )
      .first();
    if (existing) {
      await ctx.db.patch(args.invitationId, { status: "accepted" });
      return { orgId: invitation.orgId };
    }

    await ctx.db.insert("memberships", {
      userId: ctx.userId,
      orgId: invitation.orgId,
      role: invitation.role,
    });

    await ctx.db.patch(args.invitationId, { status: "accepted" });

    return { orgId: invitation.orgId };
  },
});

export const decline = userMutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invitation not found or already used");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user?.email || user.email.toLowerCase() !== invitation.email) {
      throw new Error("This invitation is not for your email");
    }

    await ctx.db.patch(args.invitationId, { status: "declined" });
    return null;
  },
});

export const revoke = userMutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invitation not found or already used");
    }

    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_userId_orgId", (q) =>
        q.eq("userId", ctx.userId).eq("orgId", invitation.orgId),
      )
      .first();
    if (!mine || mine.role === "member") {
      throw new Error("Only owners and admins can revoke invitations");
    }

    await ctx.db.delete(args.invitationId);
    return null;
  },
});
