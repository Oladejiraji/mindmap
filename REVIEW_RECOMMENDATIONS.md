# Mindmap — Recommendations & Feature Ideas

Reviewed: 2026-05-13. Pair with [REVIEW_ISSUES.md](REVIEW_ISSUES.md).

Updated after the node-first pivot. Architecture: 4-table schema (threads → nodes → chats → messages), content-based context inheritance via `node.content`, canvas-first UX, distill feature. Items reference the current codebase, not the pre-pivot structure.

---

## A. Improvements to existing code

### A.1 Collapse the service wrapper layer — **S**
Every file in [src/services/](src/services/) is a one-liner `useQuery(api.x.y)` / `useMutation(api.x.y)`. Two paths:
- **Delete** the folder; import `api` directly in components.
- **Earn** it: add optimistic updates, toast-on-error, and typed return shapes.

### A.3 Move canvas state off `useEffect` — ~~M~~ **Done (partial)**
Edges are now fully derived (`useMemo` → passed directly to `<ReactFlow>`). The edge-selection effect is eliminated. The Convex → React Flow node sync effect remains but uses a merge strategy (preserves React Flow internals, skips position overwrite) instead of full replacement. Remaining opportunity: investigate whether nodes can also go fully controlled once React Flow supports external-source patterns better.

### A.5 Add a serialization lock per node — **M**
Before `sendMessage` accepts input, check in an internal mutation whether the node's chat is currently `isStreaming`. If yes, throw `"Node busy"`. UI already disables the button, but a lock at the backend makes this an actual invariant.

### A.6 Guard `getOrCreateChat` against duplicate creation — **S**
[convex/messages.ts:124-134](convex/messages.ts#L124-L134) can create two chats for the same node under concurrent mutations. Either add a unique constraint on `chats.by_nodeId` or re-query after insert and delete the duplicate.

### A.7 Guard `distillContent` against concurrent runs — **S**
Add a `isDistilling` flag on the node (or the chat) that's set before the LLM call and cleared after. The action checks this flag before proceeding. Prevents two concurrent distill calls from racing.

### A.8 Paginate messages and nodes — **M**
Replace `.take(500)` with Convex's paginated queries, both on the frontend (`usePaginatedQuery`) and in the context builder. For prompt context, respect the model's input budget.

### A.9 Memoize message rendering — **S**
`React.memo` around `MessageBubble`; `useMemo` on the markdown render. Streaming re-renders drop from O(all-messages) to O(1).

### A.10 Move `CustomHandle` to shared — **S**
[mind-map-node.tsx](src/components/shared/canvas/mind-map-node.tsx) imports `CustomHandle` from `@/components/auth-canvas/`. Move it to `src/components/shared/canvas/` or `src/components/ui/` so the dependency direction is correct.

### A.12 Type the error path — **S**
Wrap all mutations in a small `useSafeMutation` that catches, surfaces a toast, and returns `{ ok, error }`. Replace silent fire-and-forget `.catch(handleError)` patterns.

### A.13 Add a minimal test suite — **M**
Vitest + Convex's test harness. Start with:
- `buildPromptContext` against a fabricated chain (ancestor content → system message)
- `getOrCreateChat` idempotency
- `deleteSubtree` against a known tree shape
- `distillChatToContent` output format

### A.15 Surface streaming errors in the UI — **S**
If an assistant message finalizes with an `[error]` sentinel, render a retry button in `MessageBubble`. Users currently see a silent truncation.

### A.16 Remove or sync `threads.name` — **S**
The field is dead data (REVIEW_ISSUES §2.7). Either remove it from the schema or update it when the root node is renamed.

---

## B. Feature ideas

### B.1 Manual content editing on nodes — **S**
Nodes should be editable directly — the user mentioned this. Add an inline editor or an edit view accessible from the canvas (click-to-edit on the content area, or a dedicated edit panel). This completes the "content can be added manually" flow alongside distillation.

### B.2 Content import — **M**
"Content can be added manually, emerge from chat, and maybe imported." Support pasting / uploading a document into a node's content field. Start with plain text / markdown paste; later add file upload via Convex file storage.

### B.3 Node quick-prompt from canvas — **S**
Double-click an empty area or a node on the canvas → inline prompt input → creates branch + sends message. Today canvas branching makes an empty node and forces navigation to chat.

### B.4 Keyboard navigation — **S**
Arrow keys move between sibling nodes in canvas; `Enter` opens chat; `b` creates branch. Mindmap apps live or die on keyboard ergonomics.

### B.5 Search across all content and messages — **M**
Convex has full-text search on indexes. Add search indexes on `nodes.content` and `messages.content`. Sidebar gets a `/` hotkey for global search. With the node-first model, searching node content is the primary use case.

### B.6 Collapse / expand subtrees — **S**
Both in sidebar and canvas. Canvas gets a `+`/`−` affordance per parent node; sidebar folders collapse. Cheap, big UX win as trees grow.

### B.7 Canvas mini-preview on hover — **M**
Hover a canvas node → floating preview of the full node content. Saves navigation for triage, especially for nodes with distilled content.

### B.8 Per-node model / temperature — **M**
Some nodes are "explore wildly" (Opus, temp=1.0), some are "summarize tightly" (Haiku, temp=0.2). Store `modelConfig` on node, inherit from parent, expose a small dropdown. Aligns with "each node has its own context" thesis.

### B.9 System prompt per workspace — **S**
Add a system prompt to the root node (inheritable but overrideable per-node). Lets a user set a persona / constraint per tree.

### B.10 Regenerate last assistant reply — **S**
Append-only means you can't edit, but you *can* append a new assistant message and soft-hide the previous one in the UI. Flag: `regeneratedAt: message.index`.

### B.11 Attachments / image input — **L**
Anthropic supports images. Add file-upload on `ChatInput`; store in Convex file storage; thread the `content` array format through the prompt builder.

### B.12 Cost / token meter — **S**
Anthropic stream returns usage. Store `inputTokens` / `outputTokens` / `costUSD` on each message. Sidebar shows per-workspace totals.

### B.13 Auto-layout toggles — **S**
Dagre does hierarchical top-down today. Add radial and horizontal options. Minor code change ([src/lib/layout.ts](src/lib/layout.ts) gains a `mode` arg); large visual impact.

### B.14 Gradient edges on main canvas — **S**
The auth-canvas already has a [GradientEdge](src/components/auth-canvas/gradient-edge.tsx) component with animated gradient strokes. Bring it into the main canvas to match the node design language (currently using plain `smoothstep` edges).

### B.15 Read-cache prompts with Claude prompt caching — **M**
Ancestor content doesn't change often. Mark the common prefix with `cache_control: "ephemeral"` in the Anthropic request and you pay once per hour per prefix. At deep-branch scale this saves real money.

### B.16 Session persistence hints — **S**
Remember which node the user was last viewing in a workspace (localStorage keyed on threadId). Reopening a workspace returns to that node rather than the root.

### B.17 Auto-distill option — **S**
Optionally auto-distill after N messages or when a chat goes idle. Today distill is manual (Sparkles button in header). A setting per node or per workspace to auto-distill would keep content fresh without user intervention.

### B.18 Opus/Sonnet/Haiku per-turn selector — **S**
A tiny dropdown in the chat input that overrides the model for a single send. Useful for "let me quickly get a summary in Haiku" without opening a branch.

### B.19 Agent tool use — **L**
Enable Claude to call tools during chat (web search, code execution, file read, etc.). Requires switching from plain `streamText` to a tool-use loop in [convex/lib/llm.ts](convex/lib/llm.ts): define tools via the Vercel AI SDK `tools` param, handle `tool-call` / `tool-result` parts in the stream, and render tool invocations in the message UI. Start with a small set (e.g., web search via an external API) and expand. Pairs well with B.8 (per-node model config) since research nodes benefit from tools while summary nodes don't.

---

## C. Project hygiene

### C.1 Add `CONTRIBUTING.md` — **S**
Document: pnpm only, append-only invariant, node-first architecture, manual auth checks. Saves future-you ten minutes every time.

### C.2 Update SPEC.md — **S**
Ensure it reflects the current 4-table schema and content-based context inheritance. Remove any references to `branchedAt` or message-slicing.

### C.3 CI pipeline — **M**
GitHub Action: `pnpm install`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`. Ten-minute setup, catches 80% of regressions.

### C.4 Pre-commit hook — **S**
`lint-staged` running `eslint --fix` and `tsc --noEmit`.

---

## Suggested order of operations

1. **Stabilize (week 1):** A.5 serialization lock, A.6 getOrCreateChat guard, A.7 distill guard — closes data integrity gaps.
2. **Clean (week 1):** §2 dead code sweep (A.14), A.1 service layer, A.16 threads.name, A.10 move CustomHandle.
3. **Ship content editing (week 2):** B.1 manual content editing on nodes — completes the core content flow.
4. **Refactor (week 2):** A.3 canvas effects, A.9 memo, A.12 error typing.
5. **Test (week 3):** A.13 test suite.
6. **Feature (week 3+):** B.3 quick-prompt, B.6 collapse/expand, B.9 system prompt, B.14 gradient edges, B.15 prompt caching.
