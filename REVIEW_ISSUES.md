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

## 7. Chat reliability

### 7.1 Orphaned `isStreaming` state on action crash — **Medium**

If the Convex action runtime crashes (OOM, hard timeout) after `startAssistantMessage` ([messages.ts:56](convex/messages.ts#L56)) but before the `finally` block in [llm.ts:55](convex/lib/llm.ts#L55) runs, both the message and chat stay `isStreaming: true` forever. The send button is permanently disabled and the streaming cursor never disappears. Recovery requires manual DB edits. Proposed approach: add a `lastStreamedAt` heartbeat timestamp to messages, updated on each streaming patch. Frontend treats streaming as dead if `lastStreamedAt` is stale (>10s). Needs a re-render mechanism (interval or hook) to re-evaluate staleness when no more DB updates arrive.

### 7.2 No retry on LLM failure — **High**

If `streamText()` in [llm.ts:34](convex/lib/llm.ts#L34) throws (API error, network timeout, content policy), the `finally` block finalizes the message with whatever partial content exists (often empty). The user has no way to retry — they must manually delete the orphaned message and resend. Add exponential backoff within the action, and/or a "Regenerate" button on the frontend for failed/empty assistant messages.

### 7.3 No stream timeout — **High**

No per-chunk or overall timeout on the streaming loop in [llm.ts:44-54](convex/lib/llm.ts#L44-L54). If the Claude API stalls mid-stream, the action hangs until Convex's hard action timeout (~10-15 min). Add a per-chunk timeout (e.g., abort if no chunk arrives within 30s) and an overall stream timeout.

### 7.4 No error details surfaced to user — **Medium**

When the LLM call fails, the user sees a generic "Failed to send message" toast ([handle-error.ts](src/lib/handle-error.ts)). No distinction between network errors, API rate limits, content policy violations, or auth failures. Surface structured error information so the user knows whether to retry, wait, or rephrase.

### 7.5 No stop-generation affordance — **Low**

Once streaming starts, the user cannot cancel it. A "Stop" button that aborts the stream and finalizes the message with current content would improve UX, especially for long or unwanted responses.

### 7.6 No message regeneration — **Low**

No way to regenerate the last assistant response without deleting and resending. A "Regenerate" button on the last assistant message would delete it and re-invoke `streamAssistantResponse`.

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
| High     | 2     | No LLM retry (§7.2), no stream timeout (§7.3) |
| Medium   | ~9    | Orphaned streaming (§7.1), error details (§7.4), concurrency (§4.9, §4.17, §4.18), silent `.take(500)`, N+1 walks |
| Low      | ~11   | Stop generation (§7.5), regeneration (§7.6), dead hooks/actions, naming, BYOK, rate-limit tuning, auth watcher debounce |

Start with §7.2 (LLM retry) and §7.3 (stream timeout) — those are the highest-impact reliability gaps. Then §4.17 (getOrCreateChat race) and §4.9 (append concurrency) for data integrity.
