import { ConvexError } from "convex/values";
import type { Auth } from "convex/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type AuthCtx = { auth: Auth };
type DbCtx = QueryCtx | MutationCtx;

// Structured codes so the client can branch on intent without regex-matching
// error messages. Keep these stable — `src/lib/auth-errors.ts` matches on them.
const unauthorized = () =>
  new ConvexError({ code: "UNAUTHORIZED", message: "Unauthorized" });
const notFound = () =>
  new ConvexError({ code: "NOT_FOUND", message: "Not found" });

export async function requireUserId(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) throw unauthorized();
  return identity.subject;
}

export async function requireThread(
  ctx: DbCtx,
  threadId: Id<"threads">,
): Promise<Doc<"threads">> {
  const userId = await requireUserId(ctx);
  const thread = await ctx.db.get(threadId);
  if (!thread || thread.userId !== userId) throw notFound();
  return thread;
}

export async function requireNode(
  ctx: DbCtx,
  nodeId: Id<"nodes">,
): Promise<Doc<"nodes">> {
  const userId = await requireUserId(ctx);
  const node = await ctx.db.get(nodeId);
  if (!node || node.userId !== userId) throw notFound();
  return node;
}

export async function requireMessageNode(
  ctx: DbCtx,
  messageId: Id<"messages">,
): Promise<{ message: Doc<"messages">; node: Doc<"nodes"> }> {
  const message = await ctx.db.get(messageId);
  if (!message) throw notFound();
  const node = await requireNode(ctx, message.nodeId);
  return { message, node };
}
