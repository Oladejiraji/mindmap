# Organizations & onboarding: backend spec

Mindmap is going B2B: people sign up as part of an organization, and work is shared within it. The UI for this is built (onboarding, Settings › General / Account, the disabled Members / Invite entries). It saves to `localStorage` today. This spec covers what the backend needs so it can move to Convex.

## What the UI collects

Onboarding (`/onboarding`, shown after sign-up) and Settings write one record (`src/lib/onboarding.ts`):

| Field | Type | Where it's edited |
| --- | --- | --- |
| `orgName` | string, required | Onboarding step 1, Settings › General |
| `teamSize` | `"1-10" \| "11-50" \| "51-200" \| "200+"` | Onboarding step 1, Settings › General |
| `role` | `"product" \| "design" \| "engineering" \| "research" \| "leadership" \| "other"` | Onboarding step 2, Settings › Account |
| `useCases` | array of `"research" \| "strategy" \| "product-discovery" \| "planning" \| "learning" \| "other"` | Onboarding step 3, Settings › General |
| `completedAt` | number (ms) | Set when onboarding finishes |

`orgName`, `teamSize` and `useCases` belong to the organization; `role` belongs to the person.

## Proposed schema

```ts
organizations: defineTable({
  name: v.string(),
  teamSize: v.optional(v.union(v.literal("1-10"), v.literal("11-50"), v.literal("51-200"), v.literal("200+"))),
  useCases: v.array(v.string()),
  createdBy: v.string(),            // userId
}),

memberships: defineTable({
  orgId: v.id("organizations"),
  userId: v.string(),
  role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),  // permissions
  jobRole: v.optional(v.string()),   // the "What's your role?" answer
})
  .index("by_userId", ["userId"])
  .index("by_orgId", ["orgId"]),

invites: defineTable({
  orgId: v.id("organizations"),
  email: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
  invitedBy: v.string(),
  expiresAt: v.number(),
  acceptedAt: v.optional(v.number()),
}).index("by_orgId", ["orgId"]).index("by_email", ["email"]),

users: { ...existing, onboardedAt: v.optional(v.number()) },
threads: { ...existing, orgId: v.optional(v.id("organizations")) },  // required once backfilled
```

Keep the permission role (owner / admin / member) separate from the job role (Product, Design…): one controls access, the other only tailors the experience.

## Functions

- `organizations.createWithOnboarding({ name, teamSize, useCases, jobRole })`: creates the org and an `owner` membership, and sets `users.onboardedAt`. Called by the onboarding's last step.
- `organizations.update({ orgId, name?, teamSize?, useCases? })`: owner or admin only. Used by Settings › General.
- `memberships.updateJobRole({ jobRole })`: used by Settings › Account.
- `organizations.current()`: the user's org plus their membership. Used for the workspace name and gating.
- `invites.create / accept / revoke`, plus an email send action. Powers Invite members, Settings › Members and the Collaborators "+" on nodes.

## Access checks (the big change)

Today every query and mutation checks `thread.userId === ctx.userId` (AGENTS.md: "Auth checks are manual"). With orgs that becomes **"is the caller a member of `thread.orgId`?"** That touches every function in `threads.ts`, `nodes.ts`, `messages.ts` and `chat.ts`, so put it behind a single helper (`requireThreadAccess(ctx, threadId)`) and swap the existing ownership checks for it.

Migration: create a personal org for each existing user, set `orgId` on their threads, then make `orgId` required.

## Routing

- After sign-up, the client already goes to `/onboarding`.
- Once `users.onboardedAt` exists, the `(app)` layout should send anyone without it to `/onboarding`. Not wired today, so existing accounts aren't forced through it.

## Later

- **Multi-account / switch account:** Better Auth's `multiSession` plugin. The account menu shows a disabled "Add another account".
- **Settings › Appearance** (theme), **Billing**, **Models** and **Personalization** (custom instructions) are shown as "Soon" in the Settings nav.
