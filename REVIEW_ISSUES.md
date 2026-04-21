# Mindmap — Project Review: Issues

Reviewed: 2026-04-17. Branch: `main` (working tree dirty).

This review excludes the **intentional absence of user auth** per the user's explicit confirmation. All other security, correctness, structure, and dead-code findings are fair game.

---

## 1. Security (excluding intentional lack of auth)

### 1.3 No rate limiting on `chat.sendMessage` — **Medium**

[convex/chat.ts:15-34](convex/chat.ts#L15-L34) is a public action. The UI disables the send button while streaming, but a direct Convex client or a forged WebSocket frame can fire unbounded requests, each spawning an Anthropic call. With no auth and no per-IP/per-thread limit, a bored visitor can drain the API budget in minutes. Add a rate-limit component (e.g. `@convex-dev/rate-limiter`) keyed on threadId and a global bucket.

---

## 2. Dead code & unused files

### 2.1 Empty `convex/lib/auth.ts` — **Low**

[convex/lib/auth.ts](convex/lib/auth.ts) is a zero-byte file, imported by nothing. Either delete it or populate it with the helpers SPEC mentions (even no-op stubs would be clearer than a phantom file).

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

### 2.6 Service wrappers that add no value — **Low**

All six files in [src/services/](src/services/) are one-line re-exports of `useMutation(api.x.y)` / `useAction(api.x.y)`. They don't add types, error handling, defaults, or optimistic updates — just indirection. Either (a) delete the layer and import the Convex API directly in components, or (b) earn the layer by adding optimistic updates, toast integration, and typed error handling (see Recommendations doc).

---

## 3. File structure

### 3.1 Inconsistent file naming — **Low**

Most component files use kebab-case (`thread-canvas.tsx`, `message-bubble.tsx`, `app-sidebar.tsx`). The single outlier is [src/providers/ConvexClientProvider.tsx](src/providers/ConvexClientProvider.tsx) in PascalCase. Pick one — kebab-case matches the rest of the tree.

### 3.2 `src/providers/` vs the rest — **Low**

`providers/` is a one-file directory. `hooks/` has exactly one file (`use-mobile.ts`). These "category-of-one" folders bloat the tree. Either merge `providers/` into `components/shared/` (or `app/`) or wait until there's a second provider before creating the folder.

### 3.3 `convex/` mixes domain files and `lib/` sub-modules — **Low**

`convex/chat.ts` exposes the action; `convex/lib/llm.ts` contains the Anthropic calls; `convex/lib/context.ts` contains shared query helpers. That's fine. But `convex/lib/auth.ts` being empty-but-present is confusing — see 2.1.

---

## 4. Code quality & correctness

### 4.1 `useEffect` used as state sync in `ThreadCanvas` — **Medium**

[src/components/shared/canvas/thread-canvas.tsx:119-136](src/components/shared/canvas/thread-canvas.tsx#L119-L136) builds a fingerprint string and uses a ref + effect to push Convex data into React Flow's internal state. That's exactly the "sync state from props" anti-pattern that AGENTS.md flags. React Flow's own docs recommend passing `nodes`/`edges` as props directly with `onNodesChange` / `onEdgesChange` applying patches — no internal duplicate. Alternatively, `useNodesInitialized` + derived state avoids the effect entirely. This is fragile today: any dependency change to `rfNodes`/`rfEdges` identity will trigger a silent re-sync.

### 4.2 `useEffect` mutating edges on selection — **Medium**

[src/components/shared/canvas/thread-canvas.tsx:155-165](src/components/shared/canvas/thread-canvas.tsx#L155-L165) mutates `flowEdges` via `setFlowEdges` inside an effect keyed on `ancestorEdgeIds`. Cleaner: derive `edges` inline (`rfEdges.map(e => ancestor ? {...e, animated: true} : e)`) and pass directly. No effect, no duplicated state.

### 4.8 `patchStreamingContent` throws on already-finalized messages — **Medium**

[convex/messages.ts:73-75](convex/messages.ts#L73-L75) throws `"Cannot patch a finalized message"`. The streaming loop patches on a 100 ms timer ([llm.ts:42-48](convex/lib/llm.ts#L42-L48)); if the stream finishes between a tick and the next patch arriving, the patch mutation throws. There's no guard in the loop to stop patching after `finishStreamingMessage`. Low-probability but real. Either make patches idempotent for finalized messages, or check a local `done` flag before enqueueing each patch.

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

---

## 6. Other

### 6.2 No tests — **Medium** (flagged, not blocking)

Zero test files in the repo. Given the append-only invariant, the context-assembly algorithm, and the branchedAt math, this is the exact surface that deserves unit coverage. At minimum: `buildPromptContext` with a fabricated in-memory chain, and a property test for "descendants never see sibling messages."

### 6.3 Dirty working tree — **Informational**

`git status` shows 17 modified files and 7 untracked new files on `main`. Two commits in the log. The repo looks like a "code as you go, commit later" project; no separate feature branches. Fine for a solo prototype, but worth mentioning before the next checkpoint.

### 6.4 `SPEC.md` and code have drifted — **Low**

SPEC.md still references auth helpers (`assertNodeOwner`, `assertThreadOwner`) and a `userId` column ([SPEC.md §auth](SPEC.md)), which were intentionally dropped. Either add a note "auth deferred" at the top of SPEC.md, or prune those sections so future readers aren't misled.

---

## Triage summary

| Severity | Count | Top items                                                                                                                            |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| High     | 1     | §1.1 prompt injection in title gen                                                                                                   |
| Medium   | ~13   | Rate limiting, validation, orphan streaming messages, concurrency, N+1, useEffect misuse, silent `.take(500)`, duplicated tree walks |
| Low      | ~15   | Dead hooks/actions, empty auth.ts, naming inconsistencies, missing env docs, unused `threadId` prop                                  |

Start with §4.7 (orphan streaming) and §4.9 (concurrency) — those break the append-only invariant. Then §1.3/§1.4 (rate limit + length caps) because they're cheap and gate runaway cost. Then the dead-code sweep from §2.
