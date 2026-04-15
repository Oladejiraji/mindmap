<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mindmap

A branching chat app. Conversations are a tree of nodes; each node is a whole chat. Children inherit parent context up to a branch point and stay isolated from siblings. See [SPEC.md](./SPEC.md) for the full data model and rationale.

## Non-negotiables

- Use **pnpm** for everything. Not npm, not yarn.
- **Messages are append-only.** No edits, no deletes. Ever. The `branchedAt` index depends on this.
- **Auth checks are manual.** Convex has no row-level security. Every query/mutation that touches a `node` or `message` must verify ownership via the thread/node's `userId`.
- **LLM calls happen in Convex actions**, not mutations or queries. Actions read context via `ctx.runQuery` and write results via `ctx.runMutation`.
