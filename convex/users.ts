// A raw query on purpose: userQuery throws when signed out, but the
// onboarding gate asks "who is signed in, if anyone?" and needs null back.
// Safe without the wrapper: it takes no arguments and only ever returns the
// caller's own user record.
// eslint-disable-next-line no-restricted-imports
import { query } from "./_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});
