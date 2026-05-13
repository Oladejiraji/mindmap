# Mindmap — Project Review: Issues

Reviewed: 2026-05-13. Branch: `feat/pivot`.

Updated after the node-first pivot: 4-table schema (threads → nodes → chats → messages), content-based context inheritance, canvas-first UX, distill feature. Section numbers are preserved where items survived; new items use fresh numbers.

---

## 2. Dead code & unused files

### 2.4 Unused `useThread` hook — **Low**

[src/services/threads/queries.ts:11-13](src/services/threads/queries.ts#L11-L13) defines `useThread`; no component imports it.

### 2.6 Mutation / action service wrappers add no value — **Low**

[nodes/mutations.ts](src/services/nodes/mutations.ts), [threads/mutations.ts](src/services/threads/mutations.ts), and [chat/actions.ts](src/services/chat/actions.ts) are one-line re-exports. No types, error handling, defaults, or optimistic updates — just indirection. Either delete them and call the Convex API directly, or earn the layer with optimistic updates / typed error handling.

### 2.7 `threads.name` is dead data — **Low**

[convex/threads.ts:28](convex/threads.ts#L28) stores `name` on the thread. The LLM-generated title goes to the root node via `nodes.rename`, not the thread. Sidebar shows node titles. The thread `name` field is never updated after creation and never displayed. Remove it from the schema or sync it from the root node's title.

---

## 4. Code quality & correctness

### 4.1 `useEffect` used as state sync in `ThreadCanvas` — **Low** *(partially resolved)*

The Convex → React Flow sync effect remains (legitimate: syncing with an external reactive system), but now merges into existing flow nodes instead of replacing, preserving React Flow internals. Edges are fully controlled — derived in `useMemo` and passed directly, no effect needed. The edge-selection effect (§4.2) was eliminated entirely by folding ancestor styling into the edge memo.

### 4.9 No concurrency guard on parallel sends to the same node — **Medium**

Two concurrent `sendMessage` invocations against the same node (user double-clicks, or a stale tab retries) each call `append` then `startAssistantMessage`. Both read the last `index` independently and may compute the same `nextIndex`. The `append` path at [messages.ts:38-43](convex/messages.ts#L38-L43) uses an index query, not a unique constraint. This quietly breaks SPEC's append-only guarantee. Add a per-node lock or a check-before-insert guard.

### 4.11 `.take(500)` used throughout without safeguards — **Medium**

Multiple locations silently truncate at 500:
- [convex/messages.ts:22](convex/messages.ts#L22) — `listByNode`
- [convex/messages.ts:21](convex/lib/context.ts#L21) — `getChatMessages` in context builder
- [convex/nodes.ts:16](convex/nodes.ts#L16) — `listByThread`
- [convex/nodes.ts:122](convex/nodes.ts#L122), [:147](convex/nodes.ts#L147), [:165](convex/nodes.ts#L165) — delete paths
- [convex/threads.ts:49](convex/threads.ts#L49), [:60](convex/threads.ts#L60) — thread cascade delete

A user who blows past 500 messages in one node gets silently truncated chat context and incomplete deletes. Paginate, or document and enforce the limit at write time.

### 4.12 N+1 walks in `deleteSubtree` — **Medium**

[convex/nodes.ts:141-154](convex/nodes.ts#L141-L154): BFS over the tree with one query per node, then one chat lookup + message query per node in the delete loop. Fetch all nodes in the thread once and filter in memory.

### 4.13 Re-reading `last.index` on every append — **Low**

[convex/messages.ts:38-43](convex/messages.ts#L38-L43) and [convex/messages.ts:65-70](convex/messages.ts#L65-L70): every insert does an indexed descending lookup. Cheap at small scale; at higher volume, consider storing `messageCount` on the chat record.

### 4.14 Type casts bypass validation — **Low**

[thread-canvas.tsx:65,74,198,207,239](src/components/shared/canvas/thread-canvas.tsx#L65) and [canvas-toggle.tsx](src/components/shared/canvas-toggle.tsx) cast raw strings to `Id<"nodes">` / `Id<"threads">`. If router params are tampered with, the cast succeeds, Convex rejects — fine at the network boundary, but the cast loses the opportunity to fail fast.

### 4.15 `message-list.tsx` bubbles re-render on every parent update — **Low**

[message-list.tsx](src/components/shared/chat/message-list.tsx) maps messages to `<MessageBubble>` without memo. During streaming, every 100ms the list re-renders and every bubble re-renders, re-parsing markdown for historical messages. Wrap `MessageBubble` in `React.memo` and the markdown render in `useMemo`.

### 4.16 `sendMessage` action parallel error handling is asymmetric — **Low**

[convex/chat.ts:34-37](convex/chat.ts#L34-L37) fires `streamAssistantResponse` + `maybeGenerateTitle` in parallel. `maybeGenerateTitle` swallows its own error; `streamAssistantResponse` propagates. Not a bug today, but worth watching if more parallel side-effects are added.

### 4.17 `getOrCreateChat` race condition — **Medium**

[convex/messages.ts:124-134](convex/messages.ts#L124-L134): if two concurrent mutations for the same node both find no chat and both insert, the node ends up with two chat records. The `by_nodeId` index has no uniqueness constraint. Convex mutations are serialized per-document, but two inserts to the `chats` table for different documents (different `_id`) won't conflict. Add a unique constraint or use a read-then-insert pattern with a re-check.

### 4.18 `distillContent` has no concurrency guard — **Medium**

[convex/chat.ts:72-86](convex/chat.ts#L72-L86): nothing prevents two concurrent distill calls. Both would LLM-generate content and call `updateContent`, with the last write winning. The button is disabled client-side during the call, but stale tabs or network retries can bypass this. Add a server-side guard (e.g., a `isDistilling` flag on the node, or deduplicate via Convex's scheduler).

### 4.19 Shared component imported from feature directory — **Low**

[mind-map-node.tsx:9](src/components/shared/canvas/mind-map-node.tsx#L9) imports `CustomHandle` from `@/components/auth-canvas/custom-handle`. Auth-canvas is a feature-specific directory for the sign-in/sign-up pages. Move `CustomHandle` to a shared location (e.g., `src/components/shared/canvas/` or `src/components/ui/`).

---

## 5. Convex-specific issues

### 5.1 `threads.create` inserts thread then root node — **Low**

[convex/threads.ts:24-37](convex/threads.ts#L24-L37) inserts a thread, then a root node. Both share the same `name` / `title`. Since only the root node's title is ever updated (via `maybeGenerateTitle`), the thread's `name` becomes stale immediately. See §2.7.

### 5.2 `threads.list` has no ordering index — **Low**

[convex/threads.ts:6-15](convex/threads.ts#L6-L15) uses `.order("desc")` over the `by_userId` index. For ~100 threads this is fine; past that, scanning without a composite index including `_creationTime` becomes a cost.

### 5.6 `ClientAuthWatcher` redirects on transient Convex auth blips — **Low**

[client-auth-watcher.tsx](src/components/shared/client-auth-watcher.tsx) bounces the user to `/sign-in` whenever `isAuthenticated` becomes false mid-session. Convex briefly reports `isAuthenticated: false` on transient network failures. Debounce the watcher — only act if `isAuthenticated` stays false for >~2s.

---

## 6. Other

### 6.2 No tests — **Medium**

Zero test files. Given the append-only invariant, the context-assembly algorithm (`buildPromptContext` with ancestor content), the `getOrCreateChat` pattern, and cascade deletes, this is the exact surface that deserves unit coverage.

### 6.5 Rate limit numbers are unvalidated guesses — **Low**

The limits in [convex/lib/rateLimiter.ts](convex/lib/rateLimiter.ts) were picked from intuition. Tune after real traffic.

### 6.6 BYOK (bring-your-own-key) not implemented — **Low**

All LLM calls go through the project's Anthropic key. If users supply their own key, the cost rationale for tight rate limits disappears. Implementation sketch: per-user encrypted key on a `userSettings` table, plumbed into [convex/lib/llm.ts](convex/lib/llm.ts).

---

## Triage summary

| Severity | Count | Top items |
| -------- | ----- | --------- |
| Medium   | ~7    | Concurrency (§4.9, §4.17, §4.18), useEffect misuse (§4.1, §4.2), silent `.take(500)`, N+1 walks |
| Low      | ~9    | Dead hooks/actions, naming, BYOK, rate-limit tuning, auth watcher debounce |

Start with §4.17 (getOrCreateChat race) and §4.9 (append concurrency) — those threaten data integrity. Then the dead-code sweep from §2.
