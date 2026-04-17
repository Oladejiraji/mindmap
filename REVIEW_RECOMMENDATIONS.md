# Mindmap — Recommendations & Feature Ideas

Reviewed: 2026-04-17. Pair with [REVIEW_ISSUES.md](REVIEW_ISSUES.md).

This doc is forward-looking: improvements to existing code and net-new features worth considering. Each item includes rough effort (**S/M/L**) and why it matters.

---

## A. Improvements to existing code

### A.1 Collapse the service wrapper layer — **S**
Every file in [src/services/](src/services/) is a one-liner `useQuery(api.x.y)` / `useMutation(api.x.y)`. Two paths:
- **Delete** the folder; import `api` directly in components. Fewer files, one less indirection.
- **Earn** it: add optimistic updates, toast-on-error, and typed return shapes. Recommended if you plan to grow the app.

Pick one. The current middle ground gives you the cost of the layer with none of the benefit.

### A.2 Extract shared tree helpers — **S**
Create `src/lib/tree.ts` with `buildNodeMap`, `walkAncestors`, `collectSubtree`, `flattenTree`. Replace the three duplicated implementations (REVIEW_ISSUES §3.4). Also makes testing the append-only invariant feasible.

### A.3 Move canvas state off `useEffect` — **M**
Refactor [thread-canvas.tsx](src/components/shared/canvas/thread-canvas.tsx) so React Flow consumes derived data directly:
- Pass `rfNodes`/`rfEdges` from `useMemo` straight into `<ReactFlow nodes=... edges=...>`.
- Handle drags via `onNodesChange` → local patch → debounced `updatePosition`.
- Compute ancestor-edge styling inline in the edges memo.

Eliminates both effects, removes the fingerprint hack, and aligns with AGENTS.md's "avoid useEffect."

### A.4 Harden the streaming lifecycle — **S**
In [convex/lib/llm.ts](convex/lib/llm.ts):
```ts
try {
  for await (...) { ... }
  await finishStreamingMessage(...);
} catch (err) {
  await finishStreamingMessage({ messageId, content: buffer + "\n\n[error]" });
  throw err;
}
```
Plus guard `patchStreamingContent` to no-op (not throw) on a finalized message. Closes the orphan-streaming failure mode (REVIEW_ISSUES §4.7, §4.8).

### A.5 Add a serialization lock per node — **M**
Before `sendMessage` accepts input, check in an internal mutation whether the node is currently `isStreaming`. If yes, throw `"Node busy"`. UI already disables the button, but a lock at the backend makes this an actual invariant. Pairs well with A.4.

### A.6 Add basic rate limiting — **S**
Drop in `@convex-dev/rate-limiter`. Two buckets:
- Per-nodeId, 1 send / 500 ms
- Global, 120 sends / minute

Five-line change once the component is installed, and it single-handedly protects your Anthropic budget.

### A.7 Enforce content bounds at the boundary — **S**
In `messages.append`, `nodes.rename`, `threads.create`, `nodes.createEmptyBranch`:
- Trim whitespace
- Reject empty strings after trim
- Reject `content.length > 32_000` (pick a number; document it)

Cheap, catches real abuse, prevents a 1 MiB document surprise.

### A.8 Paginate messages and nodes — **M**
Replace `.take(500)` with Convex's paginated queries, both on the frontend (`usePaginatedQuery`) and in the context builder. For prompt context, chunk by message-count and respect the model's input budget.

### A.9 Memoize message rendering — **S**
`React.memo` around `MessageBubble`; `useMemo` on the markdown render. Streaming re-renders drop from O(all-messages) to O(1).

### A.10 Document env setup — **S**
Add `.env.example`:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```
And a README section that points users at `npx convex env set ANTHROPIC_API_KEY=...`. Fixes the silent-failure onboarding cliff.

### A.11 Consistent file naming — **S**
Rename [src/providers/ConvexClientProvider.tsx](src/providers/ConvexClientProvider.tsx) → `convex-client-provider.tsx`. One git mv and an import update. Optional but worth it for grep-ability.

### A.12 Type the error path — **S**
Wrap all mutations in a small `useSafeMutation` that catches, surfaces a toast, and returns `{ ok, error }`. Replace silent fire-and-forget patterns (REVIEW_ISSUES §4.3).

### A.13 Add a minimal test suite — **M**
Vitest + Convex's test harness. Start with:
- `buildPromptContext` against a fabricated chain
- `branchedAt` math (root has none; child inherits first N)
- `deleteSubtree` against a known tree shape

These are pure-ish functions and high-value — they guard the non-negotiable invariant.

### A.14 Consolidate or delete the dead branches code — **S**
Either wire up `sendToBranch` / `createBranch` (REVIEW_ISSUES §2.2, §2.3) behind a feature like "branch with a first prompt in one shot," or delete them and their service wrappers.

### A.15 Surface streaming errors in the UI — **S**
If an assistant message finalizes with an `[error]` sentinel (see A.4), render a retry button in `MessageBubble`. Users currently see a silent truncation and reload.

---

## B. Feature ideas

### B.1 Branch off a specific message — **M**
Right-click a message → "Branch from here." Creates a child node with `branchedAt = message.index + 1`, seeds the first user message with an empty prompt. This is already the logical next step given SPEC — it's what `branchedAt` was designed for. Today you can only branch from "now."

### B.2 Node quick-prompt from canvas — **S**
Double-click an empty area or a node on the canvas → inline prompt input → creates branch + sends message. Today canvas branching makes an empty node and forces navigation to chat. One-shot branching feels much better for ideation.

### B.3 Keyboard navigation — **S**
Arrow keys move between sibling nodes in canvas; `Enter` opens chat; `b` creates branch. Mindmap apps live or die on keyboard ergonomics.

### B.4 Search across all messages — **M**
Convex has full-text search on indexes. Add a `by_content` search index on messages; sidebar gets a `/` hotkey for global search. Given branches multiply content, search becomes critical past ~5 threads.

### B.5 Export / share a thread — **M**
"Export as Markdown" for a node's ancestor chain. "Share read-only link" creates a tokenized URL + internal query. Doubles as a dogfooding story: you'll find rendering bugs fast.

### B.6 Collapse / expand subtrees — **S**
Both in sidebar and canvas. Canvas gets a `+`/`−` affordance per parent; sidebar folders collapse. Cheap, big UX win as trees grow.

### B.7 Canvas mini-preview on hover — **M**
Hover a canvas node → floating preview of last assistant message. Saves navigation for triage.

### B.8 Per-node model / temperature — **M**
Some branches are "explore wildly" (Opus, temp=1.0), some are "summarize tightly" (Haiku, temp=0.2). Store `modelConfig` on node, inherit from parent, expose a small dropdown. Aligns with the app's "each branch has its own context" thesis.

### B.9 System prompt per thread — **S**
Currently there's no system prompt. Adding one to the root (and making it inheritable but overrideable per-node) lets a user set a persona / constraint per tree.

### B.10 Regenerate last assistant reply — **S**
Append-only means you can't edit, but you *can* append a new assistant message and soft-hide the previous one in the UI. Flag: `regeneratedAt: message.index`. A small extension that respects the invariant.

### B.11 Attachments / image input — **L**
Anthropic supports images. Add a file-upload on `ChatInput`; store in Convex file storage; thread the `content` array format through the prompt builder. Meaningful effort because the schema changes to a richer `content` union type.

### B.12 Cost / token meter — **S**
Anthropic stream returns usage. Store `inputTokens` / `outputTokens` / `costUSD` on each message. Sidebar shows per-thread totals. Essential for any serious LLM app.

### B.13 Auto-layout toggles — **S**
Dagre does hierarchical top-down today. Add radial and horizontal options. Minor code change ([src/lib/layout.ts](src/lib/layout.ts) gains a `mode` arg); large visual impact.

### B.14 Markdown shortcuts in chat-input — **S**
`Cmd+B` wraps selection in `**`, etc. Also support pasting images (B.11 ties in).

### B.15 Read-cache prompts with Claude prompt caching — **M**
Ancestor chains don't change. Mark the common prefix with `cache_control: "ephemeral"` in the Anthropic request and you pay once per hour per prefix. At deep-branch scale this is real money saved. Pairs well with B.12.

### B.16 Session persistence hints — **S**
Remember which node the user was last viewing in a thread (localStorage keyed on threadId). Reopening a thread returns to that node rather than the root. Tiny change, big "it remembers me" feel.

### B.17 Telemetry hook — **S**
Add a `lib/analytics.ts` no-op shim. Instrument `sendMessage` outcomes, branch creations, delete-subtree confirmations. Even without wiring a backend, the calls make it trivial to add one later.

### B.18 Opus/Sonnet/Haiku per-turn selector — **S**
A tiny dropdown in the chat input that overrides the model for a single send. Useful for "let me quickly get a summary in Haiku" without opening a branch. Ties to B.8.

---

## C. Project hygiene

### C.1 Add `CONTRIBUTING.md` — **S**
Document: pnpm only, append-only invariant, auth deliberately off, manual security-review checklist. Saves future-you ten minutes every time.

### C.2 Update SPEC.md — **S**
Mark the auth section "deferred" with rationale. Drop mentions of `userId` columns unless you plan to add them back. Cross-link this review.

### C.3 CI pipeline — **M**
GitHub Action: `pnpm install`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`. Ten-minute setup, catches 80% of the regressions this codebase would otherwise accumulate.

### C.4 Pre-commit hook — **S**
`lint-staged` running `eslint --fix` and `tsc --noEmit`. Catches issues before they land in the dirty-working-tree soup.

---

## Suggested order of operations

1. **Stabilize (week 1):** A.4 + A.5 + A.6 + A.7 — invariant + cost protection.
2. **Clean (week 1):** §2 dead code sweep, A.1, A.2, A.11.
3. **Refactor (week 2):** A.3, A.9, A.12.
4. **Test (week 2):** A.13.
5. **Feature (week 3+):** B.1, B.6, B.9, B.15 — highest leverage for a branching chat app.

Everything below that depends on how far you want to take the product.
