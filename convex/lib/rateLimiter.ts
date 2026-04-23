import { RateLimiter, MINUTE, DAY } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Cheap writes (rename, reposition, message append, thread/branch create).
  // Token bucket lets a user burst through ~30 quick UI actions, then settles
  // to 2/sec. Drip rate is intentionally the point at which UI clicks outpace
  // humans — if you hit it, something is wrong.
  standardWrite: {
    kind: "token bucket",
    rate: 120,
    period: MINUTE,
    capacity: 30,
  },

  // Per-minute cap on LLM actions. Tight because each call hits Anthropic
  // and costs real money. Capacity of 5 lets a user fire off a few branches
  // back-to-back without immediately stalling.
  llmRequest: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 5,
  },

  // Hard daily ceiling on LLM calls per user. Fixed window is the right fit:
  // "300/day, period" — no burst semantics needed.
  llmRequestDaily: {
    kind: "fixed window",
    rate: 300,
    period: DAY,
  },
});

type Bucket = "standardWrite" | "llmRequest" | "llmRequestDaily";

type Ctx = Parameters<typeof rateLimiter.limit>[0];

export async function enforceLimit(
  ctx: Ctx,
  bucket: Bucket,
  userId: string,
): Promise<void> {
  await rateLimiter.limit(ctx, bucket, { key: userId, throws: true });
}
