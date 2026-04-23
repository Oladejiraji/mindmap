import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";
import { requireUserId } from "./auth";
import { enforceLimit } from "./rateLimiter";

/**
 * Public query for signed-in users.
 *
 * Rejects with `UNAUTHORIZED` if the caller has no session.
 * Exposes `ctx.userId: string`.
 *
 * Doc-level ownership (e.g. `requireNode`, `requireThread`) still has to be
 * called inline — those depend on args and can't be abstracted here.
 *
 * @example
 * export const list = userQuery({
 *   args: {},
 *   handler: async (ctx) =>
 *     ctx.db.query("threads").withIndex("by_userId", q => q.eq("userId", ctx.userId)).collect(),
 * });
 */
export const userQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const userId = await requireUserId(ctx);
    return { userId };
  }),
);

/**
 * Public mutation for signed-in users. Rate-limited.
 *
 * Rejects with `UNAUTHORIZED` if the caller has no session, or `RateLimited`
 * if they've exhausted the `standardWrite` bucket (120/min, burst 30 per user).
 * Exposes `ctx.userId: string`.
 *
 * Doc-level ownership (e.g. `requireNode`, `requireThread`) still has to be
 * called inline.
 *
 * @example
 * export const rename = userMutation({
 *   args: { nodeId: v.id("nodes"), title: v.string() },
 *   handler: async (ctx, args) => {
 *     await requireNode(ctx, args.nodeId);
 *     await ctx.db.patch(args.nodeId, { title: args.title });
 *   },
 * });
 */
export const userMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const userId = await requireUserId(ctx);
    await enforceLimit(ctx, "standardWrite", userId);
    return { userId };
  }),
);

/**
 * Public action that calls the LLM on our Anthropic key. Rate-limited.
 *
 * Rejects with `UNAUTHORIZED` if the caller has no session, or `RateLimited`
 * if they've exhausted either the `llmRequest` bucket (20/min, burst 5) or
 * the `llmRequestDaily` ceiling (300/day). Exposes `ctx.userId: string`.
 *
 * Use this for any action that spends Anthropic budget. For internal
 * server-to-server actions that don't hit the LLM, use `internalAction`.
 *
 * Note: rate limits are consumed before the handler runs, so an action that
 * fails its own ownership check still spends a token (self-harm only — the
 * bucket is per-user).
 *
 * @example
 * export const sendMessage = llmAction({
 *   args: { nodeId: v.id("nodes"), content: v.string() },
 *   handler: async (ctx, args) => {
 *     await ctx.runQuery(internal.nodes.assertOwned, { nodeId: args.nodeId });
 *     // ...stream LLM response...
 *   },
 * });
 */
export const llmAction = customAction(
  action,
  customCtx(async (ctx) => {
    const userId = await requireUserId(ctx);
    await enforceLimit(ctx, "llmRequest", userId);
    await enforceLimit(ctx, "llmRequestDaily", userId);
    return { userId };
  }),
);
