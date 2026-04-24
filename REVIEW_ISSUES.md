# Mindmap — Project Review: Issues

Reviewed: 2026-04-17 (last pruned 2026-04-23). Branch: `main`.

Remaining issues after the auth, rate-limit, validation, and streaming-lifecycle work landed. Section numbers are preserved from the original review so line references stay stable — gaps mean that item has been resolved and removed.

---

## 2. Dead code & unused files

### 2.2 Unused `sendToBranch` action — **Low**

- [convex/chat.ts:36-56](convex/chat.ts#L36-L56) defines the action.
- [src/services/chat/actions.ts:8-10](src/services/chat/actions.ts#L8-L10) exports `useSendToBranch`.

Neither is referenced by any component (`grep` confirms zero call sites). Canvas-side branching uses `createEmptyBranch` + navigation, and sidebar branching uses the same. Delete both, or wire the feature up if it was intentional.

### 2.3 Unused `createBranch` mutation — **Low**

[convex/nodes.ts:44-77](convex/nodes.ts#L44-L77) (`createBranch` with `firstMessageContent`) and its wrapper [src/services/nodes/mutations.ts:4-6](src/services/nodes/mutations.ts#L4-L6) (`useCreateBranch`) have no call sites. Only `createEmptyBranch` is used. Likely left over from an earlier branching UX. Delete or consolidate.

### 2.4 Unused `useThread` hook — **Low**

[src/services/threads/queries.ts:14-18](src/services/threads/queries.ts#L14-L18) defines `useThread`; no component calls it. Same for `threads.get` as far as the frontend is concerned.

### 2.5 Boilerplate `convex/README.md` — **Low**

Generated-at-init boilerplate; adds noise. Replace with a two-line pointer to SPEC / AGENTS, or delete.

### 2.6 Mutation / action service wrappers add no value — **Low**

[nodes/mutations.ts](src/services/nodes/mutations.ts), [threads/mutations.ts](src/services/threads/mutations.ts), and [chat/actions.ts](src/services/chat/actions.ts) are one-line re-exports of `useMutation` / `useAction`. No types, error handling, defaults, or optimistic updates — just indirection. Either delete them and call the Convex API directly, or earn the layer with optimistic updates / typed error handling (see Recommendations doc).

## 4. Code quality & correctness

### 4.1 `useEffect` used as state sync in `ThreadCanvas` — **Medium**

[src/components/shared/canvas/thread-canvas.tsx:119-136](src/components/shared/canvas/thread-canvas.tsx#L119-L136) builds a fingerprint string and uses a ref + effect to push Convex data into React Flow's internal state. That's exactly the "sync state from props" anti-pattern that AGENTS.md flags. React Flow's own docs recommend passing `nodes`/`edges` as props directly with `onNodesChange` / `onEdgesChange` applying patches — no internal duplicate. Alternatively, `useNodesInitialized` + derived state avoids the effect entirely. This is fragile today: any dependency change to `rfNodes`/`rfEdges` identity will trigger a silent re-sync.

### 4.2 `useEffect` mutating edges on selection — **Medium**

[src/components/shared/canvas/thread-canvas.tsx:155-165](src/components/shared/canvas/thread-canvas.tsx#L155-L165) mutates `flowEdges` via `setFlowEdges` inside an effect keyed on `ancestorEdgeIds`. Cleaner: derive `edges` inline (`rfEdges.map(e => ancestor ? {...e, animated: true} : e)`) and pass directly. No effect, no duplicated state.

### 4.9 No concurrency guard on parallel sends to the same node — **Medium**

Two concurrent `sendMessage` invocations against the same nodeId (user double-clicks, or a stale tab retries) each call `append` then `startAssistantMessage`. Both read the last `index` independently, both may compute the same `nextIndex`, and one insert may win while the other sees the same index — the `append` path uses a secondary index query, not a unique constraint. This quietly breaks SPEC's append-only guarantee. Add a per-node lock or check that the last message index is still what you read before inserting.

### 4.10 `branchedAt` semantics are implicit — **Low**

[convex/schema.ts:12](convex/schema.ts#L12) makes `branchedAt` optional; [convex/lib/context.ts:49](convex/lib/context.ts#L49) reads `chain[i + 1].branchedAt ?? 0`, meaning "no branchedAt = inherit zero messages." This is correct for the root (which has no parent messages to inherit) but conflates "unknown / legacy" with "inherit nothing." Make it required on non-root nodes and assert in the code.

### 4.11 `listByNode` / `listByThread` use `.take(500)` silently — **Medium**

- [convex/messages.ts:7-11](convex/messages.ts#L7-L11)
- [convex/nodes.ts:5-13](convex/nodes.ts#L5-L13)
- [convex/nodes.ts:113-125](convex/nodes.ts#L113-L125) (delete)
- [convex/nodes.ts:149-155](convex/nodes.ts#L149-L155) (subtree traversal)
- [convex/lib/context.ts:14-17](convex/lib/context.ts#L14-L17) (prompt context)

A user who blows past 500 messages in one node or 500 nodes in one thread gets silently truncated output. Paginate, or document and enforce the limit at write time.

### 4.12 N+1 walks in `deleteSubtree` and `buildPromptContext` — **Medium**

- [convex/nodes.ts:146-156](convex/nodes.ts#L146-L156): BFS over the tree with one query per node.
- [convex/lib/context.ts:46-55](convex/lib/context.ts#L46-L55): one `getNodeMessages` call per ancestor, sequentially.

Parallelize ancestor message fetches with `Promise.all`. For `deleteSubtree`, fetch all nodes in the thread once and filter in memory.

### 4.13 Re-reading `last.index` on every append — **Low**

[convex/messages.ts:22-28](convex/messages.ts#L22-L28), [:46-52](convex/messages.ts#L46-L52): every insert does an indexed descending lookup. Cheap at small scale; once you add rate-limit / retry logic, consider storing `messageCount` on the node.

### 4.14 Type casts bypass validation — **Low**

[src/components/shared/canvas/thread-canvas.tsx:56,63,182,222](src/components/shared/canvas/thread-canvas.tsx#L56) and [src/components/shared/canvas-toggle.tsx:12](src/components/shared/canvas-toggle.tsx#L12) cast raw strings to `Id<"nodes">` / `Id<"threads">`. If router params are tampered with, the cast succeeds, Convex rejects — fine at the network boundary, but the cast loses the opportunity to fail fast with a nicer error.

### 4.15 `message-list.tsx` bubbles re-render on every parent update — **Low**

[src/components/shared/chat/message-list.tsx](src/components/shared/chat/message-list.tsx) maps messages to `<MessageBubble>` without memo. During streaming, every 100 ms the list re-renders and every bubble re-renders, re-parsing markdown for historical messages. Wrap `MessageBubble` in `React.memo` and the markdown render in `useMemo` keyed on `(id, content, isStreaming)`.

### 4.16 `sendMessage` action parallel error handling is asymmetric — **Low**

[convex/chat.ts:15-34](convex/chat.ts#L15-L34) fires `streamAssistantResponse` + `maybeGenerateTitle` in parallel. `maybeGenerateTitle` swallows its own error; `streamAssistantResponse` propagates. Today the client catches the rejection via `showError`, so stream failures correctly surface — **not a bug right now**, but worth watching: if we add more parallel side-effects here later, one failure will still cancel the sibling's awaited result.

**Fix (if/when needed):** switch to `Promise.allSettled` and decide per-task whether to rethrow.

---

## 5. Convex-specific issues

### 5.1 `threads.create` does two inserts without a transaction boundary — **Low**

[convex/threads.ts:18-28](convex/threads.ts#L18-L28) inserts a thread, then a root node referencing it. Convex mutations are transactional, so this is actually safe — **but** the root node inherits `title` from the thread's `name`, which at creation is always `"Untitled"` ([src/app/page.tsx:19](src/app/page.tsx#L19)). The thread title is then never updated; only the root node's title gets the LLM-generated name (via `nodes.rename` from `maybeGenerateTitle`). Sidebar shows node titles, so this works, but the `threads.name` field is now dead data — either remove it or update it from `maybeGenerateTitle` too.

### 5.2 `threads.list` has no ordering index — **Low**

[convex/threads.ts:4-9](convex/threads.ts#L4-L9) uses `.order("desc")` over the full table, keyed on `_creationTime`. For ~100 threads this is fine; past that, scanning without an index becomes a cost. Not urgent.

### 5.3 Public functions that could be internal — **Low**

`chat.getContext` is already `internalQuery` ✓. But `nodes.createEmptyBranch`, `nodes.createBranch` (if kept), and `nodes.updatePosition` are all public yet should never be called from outside the app. With no auth, "public" = "internet-exposed." Making them internal doesn't help much (no auth anyway), but combined with a small server-rendered page that proxies them via an action, you'd get a chance to add rate-limiting at one chokepoint.

### 5.4 Per-navigation JWT round-trip to Convex in production — **Medium** (prod-only)

Every protected page render calls `isAuthenticated()` from [src/lib/auth-server.ts](src/lib/auth-server.ts) in the `(app)` server layout. That's an HTTP fetch to `${convexSiteUrl}/api/auth/convex/token` on each request, memoized once per RSC fetch via `React.cache`. In dev the latency is invisible; in prod it adds ~50–200ms to TTFB on every protected nav and bills a Convex HTTP-action invocation per page load. Also a SPOF — if the Convex site URL is unreachable, every page 500s.

**Fix:** turn on `jwtCache` when constructing the helper:

```ts
// src/lib/auth-server.ts
convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    expirationToleranceSeconds: 60,
    isAuthError, // from src/lib/auth-errors.ts
  },
});
```

With the cache on, the JWT is decoded from the cookie locally until it's within 60s of expiry or a downstream query rejects it. Turns per-nav round-trip into "once every ~55 minutes." Trade-off: a server-side revoked session keeps validating locally for up to `expirationToleranceSeconds` seconds. Acceptable — revocation is rare and the client-side `redirectToSignInIfAuthError` still catches reject responses from any live query.

Do this before prod launch, not before.

### 5.6 `ClientAuthWatcher` redirects on transient Convex auth blips — **Low**

[src/components/shared/client-auth-watcher.tsx](src/components/shared/client-auth-watcher.tsx) bounces the user to `/sign-in` whenever `useConvexAuth().isAuthenticated` becomes false mid-session. That's the right call for real session expiry or cookie loss, but Convex will also briefly report `isAuthenticated: false` on transient network failures — e.g., one failed `/api/auth/convex/token` fetch during a flaky connection or a Convex cold-start. In those cases the session cookie is still valid; the very next request would recover. Instead, we teleport the user to sign-in with any in-flight UI state lost (unsent optimistic UI, form contents, canvas positions).

**Fix (when needed):** debounce the watcher — only act if `isAuthenticated` stays false for >~2s. A `setTimeout` on the falsy transition, cleared on the truthy transition, handles this. Deferred because solo dev has stable connectivity; flag for prod.

---

## 6. Other

### 6.2 No tests — **Medium** (flagged, not blocking)

Zero test files in the repo. Given the append-only invariant, the context-assembly algorithm, and the branchedAt math, this is the exact surface that deserves unit coverage. At minimum: `buildPromptContext` with a fabricated in-memory chain, and a property test for "descendants never see sibling messages."

### 6.5 Rate limit numbers are unvalidated guesses — **Low**

The initial limits in [convex/lib/rateLimiter.ts](convex/lib/rateLimiter.ts) (`standardWrite` 120/min cap 30, `llmRequest` 20/min cap 5, `llmRequestDaily` 300/day) were picked from intuition, not data. Once there's real usage, pull numbers from Convex dashboard / Anthropic billing and tune. Signals to watch: users hitting `RATE_LIMITED` on normal flows (too tight), or cost/minute climbing without the limit ever biting (too loose). Revisit after ~2 weeks of real traffic.

### 6.6 BYOK (bring-your-own-key) not implemented — **Low**

Today every LLM call goes through our Anthropic key, so `llmRequest` / `llmRequestDaily` exist primarily as a cost-control ceiling. If we let users supply their own Anthropic key, the cost rationale disappears for those users — keep an abuse-only floor but skip the tight cost-shaped cap. Implementation sketch: store an encrypted per-user key on a `userSettings` table, plumb it into [convex/lib/llm.ts](convex/lib/llm.ts), and have the rate-limit helper take a `hasOwnKey` flag that swaps `llmRequest` for a looser `llmRequestBYOK` bucket (or skips entirely).

---

## Triage summary

| Severity | Count | Top items                                                                           |
| -------- | ----- | ----------------------------------------------------------------------------------- |
| Medium   | ~7    | Concurrency guard, N+1 walks, useEffect misuse, silent `.take(500)`, prod JWT cache |
| Low      | ~12   | Dead hooks/actions, naming inconsistencies, drifted SPEC, BYOK, rate-limit tuning   |

Start with §4.9 (concurrency) — that one still threatens the append-only invariant. Then §5.4 (JWT cache) before prod launch. Then the dead-code sweep from §2.
