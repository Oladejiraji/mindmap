import { createClient, type AuthFunctions, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

// Must match `identity.tokenIdentifier`: the JWT issuer (CONVEX_SITE_URL, see
// getAuthConfigProvider) and subject (the Better Auth user id).
const tokenIdentifierFor = (authUserId: string) =>
  `${process.env.CONVEX_SITE_URL}|${authUserId}`;

const findUser = (ctx: MutationCtx, authUserId: string) =>
  ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifierFor(authUserId)),
    )
    .unique();

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, authUser) => {
        await ctx.db.insert("users", {
          tokenIdentifier: tokenIdentifierFor(authUser._id),
          name: authUser.name,
          email: authUser.email,
        });
      },
      onUpdate: async (ctx, newUser, oldUser) => {
        if (newUser.name === oldUser.name && newUser.email === oldUser.email) return;
        const user = await findUser(ctx, newUser._id);
        if (!user) return;
        await ctx.db.patch(user._id, { name: newUser.name, email: newUser.email });
      },
      onDelete: async (ctx, authUser) => {
        const user = await findUser(ctx, authUser._id);
        if (user) await ctx.db.delete(user._id);
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    database: authComponent.adapter(ctx),
    baseURL: process.env.SITE_URL,
    trustedOrigins: (request) => {
      const siteUrl = process.env.SITE_URL ?? "";
      const origin = request?.headers.get("origin") ?? "";
      try {
        if (new URL(origin).hostname === new URL(siteUrl).hostname) {
          return [origin];
        }
      } catch {}
      return [siteUrl];
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });
