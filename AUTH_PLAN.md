# Auth Setup Plan — Better Auth + Convex

Scope: add email/password auth via `@convex-dev/better-auth`, enforce per-user data isolation across every existing Convex function, wipe dev and prod DBs so the new required `userId` columns can be introduced cleanly.

App has no live users — wholesale changes are fine.

## Decisions

- **Provider**: `@convex-dev/better-auth` (v1.5.3 of `better-auth`, pinned). Owns its own `user`/`session`/`account`/`verification` tables inside the component — we do **not** define a `users` table in our own schema.
- **Method**: email + password only.
- **Ownership model**: `userId: v.string()` required on **both** `threads` and `nodes` (denormalized). Messages inherit via `node.userId`. Auth checks stay O(1) in the chat hot path.
- **DB reset**: full wipe of dev and prod via Convex dashboard before schema deploys. Required because the new `userId` columns are non-optional.
- **Routing**: no Next middleware. Gate UI with Convex's `<Authenticated>` / `<Unauthenticated>` + a client-side redirect wrapper. Better Auth HTTP endpoints mounted on the Convex `.site` URL via the catch-all `app/api/auth/[...all]/route.ts`.
- **Keeping `sendToBranch` / `createBranch`**: currently unused in the UI but the user plans to wire them up for "branch with a first message" — port auth into them too.

## Phase 1 — Install & register the component

1. `pnpm add convex@latest @convex-dev/better-auth` and `pnpm add --save-exact better-auth@1.5.3`.
2. Create `convex/convex.config.ts`: `app.use(betterAuth)`.
3. Create `convex/auth.config.ts`: wire `getAuthConfigProvider()`.
4. Create `convex/auth.ts`:
   - `authComponent = createClient<DataModel>(components.betterAuth)`
   - `createAuth(ctx)` returning `betterAuth(...)` from `better-auth/minimal` with `emailAndPassword: { enabled: true }` and the `convex({ authConfig })` plugin.
   - Export a public `getCurrentUser` query.
5. Create `convex/http.ts`: `authComponent.registerRoutes(http, createAuth)`.
6. Env:
   - **Convex**: `npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"` and `npx convex env set SITE_URL http://localhost:3000` (dev) + the prod URL on prod.
   - **Next.js `.env.local`**: add `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. `NEXT_PUBLIC_CONVEX_SITE_URL` is already set.

## Phase 2 — Schema changes + DB wipe

Update [convex/schema.ts](convex/schema.ts):

- `threads`: add `userId: v.string()` + `by_userId` index.
- `nodes`: add `userId: v.string()` + `by_userId_and_threadId` compound index (scoped listing).
- `messages`: no change.

Wipe order:

1. Drop all rows in `threads`, `nodes`, `messages` on **both** dev and prod via dashboard (Data → table → Clear table). Safe — no live users.
2. Deploy schema.

## Phase 3 — Server auth helpers

Replace the empty [convex/lib/auth.ts](convex/lib/auth.ts) with:

- `requireUserId(ctx)` — reads `ctx.auth.getUserIdentity()`, throws `ConvexError("Unauthorized")` if missing. Returns `identity.subject`.
- `requireThread(ctx, threadId)` — get + verify `userId` match + return the doc.
- `requireNode(ctx, nodeId)` — same, against `nodes.userId`.
- `requireMessageNode(ctx, messageId)` — fetch message, then `requireNode(message.nodeId)`.

All helpers throw `ConvexError("Not found")` on missing OR mismatched ownership — don't leak existence.

## Phase 4 — Wire auth into every Convex function

**[convex/threads.ts](convex/threads.ts)**

- `list` → use `by_userId` index instead of full-table scan.
- `get` → `requireThread`.
- `create` → set `userId` on thread AND on root node.
- `remove` → `requireThread` then cascade.

**[convex/nodes.ts](convex/nodes.ts)**

- `listByThread` → `requireThread` + then query nodes.
- `get` → `requireNode`.
- `rename` / `updatePosition` → `requireNode` then patch.
- `createBranch` → `requireNode(parentId)`, propagate `userId` to new node.
- `createEmptyBranch` → `requireNode(parentId)`, propagate `userId` to new node.
- `deleteLeafNode` / `deleteSubtree` → `requireNode` + assert ownership on every visited node (defense-in-depth against data corruption).

**[convex/messages.ts](convex/messages.ts)**

- `listByNode` → `requireNode`.
- `append` → `requireNode`.
- `startAssistantMessage` / `patchStreamingContent` / `finishStreamingMessage` stay internal — no changes (only called from trusted actions).

**[convex/chat.ts](convex/chat.ts)**

- `sendMessage` action → `requireUserId` + verify node ownership via a new `internalQuery` wrapper (`internal.nodes.assertOwnership`) since actions can't read `ctx.db` directly.
- `sendToBranch` action → same treatment: `requireUserId` + assert ownership of `parentId` before calling `createBranch`.
- `getContext` (internal) — no change.

## Phase 5 — Client wiring

1. **`src/lib/auth-client.ts`** — `createAuthClient({ plugins: [convexClient()] })`.
2. **`src/providers/convex-client-provider.tsx`** — replace `ConvexProvider` with `ConvexBetterAuthProvider`. Rename file to kebab-case (closes [REVIEW_ISSUES.md](REVIEW_ISSUES.md) §3.1).
3. **`src/app/api/auth/[...all]/route.ts`** — `export const { GET, POST } = handler` from `convexBetterAuthNextJs({ convexUrl, convexSiteUrl })`.
4. **Sign-in / sign-up pages**:
   - `src/app/sign-in/page.tsx` — email + password form, calls `authClient.signIn.email`.
   - `src/app/sign-up/page.tsx` — email + password form, calls `authClient.signUp.email`.
   - Minimal UI — small text, no heavy borders, per design principles.
5. **Route gating**:
   - [src/app/layout.tsx](src/app/layout.tsx) splits on `<Authenticated>` (renders sidebar + main) vs `<Unauthenticated>` (renders children full-screen so sign-in/sign-up work without the sidebar shell).
   - Add a small `<AuthGate>` wrapper for `/` and `/t/...` that redirects to `/sign-in` when unauthenticated via `useConvexAuth()`.
6. **Header** ([src/components/shared/header.tsx](src/components/shared/header.tsx)) — add a minimal user menu: email + sign-out.

## Phase 6 — Validation

1. Create two accounts (A, B) in a fresh DB.
2. A creates a thread with messages → B cannot see it in sidebar.
3. B visits `/t/<A-threadId>/n/<A-nodeId>` directly → error UI, no data leak.
4. From Convex dashboard as user A, call mutations targeting user B's node → rejected.
5. Sign out → UI returns to sign-in; Convex queries stop.

## Files touched

**New**: `convex/convex.config.ts`, `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx`.

**Modified**: [convex/schema.ts](convex/schema.ts), [convex/lib/auth.ts](convex/lib/auth.ts), [convex/threads.ts](convex/threads.ts), [convex/nodes.ts](convex/nodes.ts), [convex/messages.ts](convex/messages.ts), [convex/chat.ts](convex/chat.ts), [src/providers/ConvexClientProvider.tsx](src/providers/ConvexClientProvider.tsx) (rename → kebab-case), [src/app/layout.tsx](src/app/layout.tsx), [src/app/page.tsx](src/app/page.tsx), [src/components/shared/header.tsx](src/components/shared/header.tsx), `package.json`, `.env.local`, `.env.example`.

## Review-issue side-effects

Closes while we're here:

- §3.1 PascalCase provider file — renamed to kebab-case

Unchanged (user wants them kept): §2.2 `sendToBranch`, §2.3 `createBranch`, §2.4 `useThread`.
