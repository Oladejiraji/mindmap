# Convex Backend

Mindmap's backend: real-time data, auth, LLM orchestration.

## Schema (4 tables)

```
threads → nodes → chats → messages
```

- **threads** — top-level workspace per user
- **nodes** — tree of research units; each has a `title`, optional `content` (distilled knowledge), optional `position` (canvas coords), and a `parentId` linking to its parent node (`null` for root)
- **chats** — at most one per node, created on demand via `getOrCreateChat`
- **messages** — append-only chat log, ordered by `index` within a chat

See [schema.ts](./schema.ts) for the full definition.

## Key files

| File | Role |
| --- | --- |
| `threads.ts` | CRUD for workspaces |
| `nodes.ts` | Node tree operations: create, rename, reposition, branch, delete (leaf & subtree) |
| `messages.ts` | Append messages, list by node, `getOrCreateChat` |
| `chat.ts` | LLM actions: `sendMessage`, `distillContent` |
| `lib/context.ts` | `buildPromptContext` — walks ancestor nodes to assemble LLM prompt with inherited content |
| `lib/llm.ts` | Anthropic streaming, title generation, distillation |
| `lib/functions.ts` | Authenticated wrappers: `userQuery`, `userMutation`, `llmAction` |
| `lib/auth.ts` | Ownership checks: `requireThread`, `requireNode` |
| `lib/rateLimiter.ts` | Per-user rate limits on LLM calls |
| `lib/validation.ts` | Input normalization (e.g. `normalizeTitle`) |
| `lib/models.ts` | Model constants |

## Conventions

- **Auth is manual.** No row-level security — every query/mutation verifies `userId` via `requireThread` / `requireNode`.
- **Messages are append-only.** No edits, no deletes once written.
- **LLM calls live in actions**, not mutations or queries. Actions read via `ctx.runQuery`, write via `ctx.runMutation`.
- **Context flows through node content**, not message history. `buildPromptContext` walks up the ancestor chain collecting each node's `content` field.
