import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { mutation, query } from "../_generated/server";
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
 * Public mutation that starts an AI reply on our Anthropic key. Rate-limited.
 *
 * Rejects with `UNAUTHORIZED` if the caller has no session, or `RateLimited`
 * if they've exhausted either the `llmRequest` bucket (20/min, burst 5) or
 * the `llmRequestDaily` ceiling (300/day). Exposes `ctx.userId: string`.
 *
 * The model call itself runs in a scheduled internal action. Because this
 * is a mutation, a refused request (ownership, a reply already running)
 * rolls back and spends no tokens.
 *
 * @example
 * export const send = llmMutation({
 *   args: { nodeId: v.id("nodes"), content: v.string() },
 *   handler: async (ctx, args) => {
 *     await requireNode(ctx, args.nodeId);
 *     // ...save the message, schedule internal.chat.respond...
 *   },
 * });
 */
export const llmMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const userId = await requireUserId(ctx);
    await enforceLimit(ctx, "llmRequest", userId);
    await enforceLimit(ctx, "llmRequestDaily", userId);
    return { userId };
  }),
);
