@AGENTS.md

# Mindmap project notes

- **Package manager: pnpm.** Never use `npm` or `yarn`. All install/run commands go through `pnpm`.
- **Backend: Convex.** Schema and functions live in `convex/`. Mutations for writes, queries for reads (reactive), actions for LLM/external calls.
- **Design spec: [SPEC.md](./SPEC.md).** Read it before changing the data model. It captures the branching semantics, immutability guarantees, and the reasoning behind them — several decisions have non-obvious consequences if ignored.
- **Append-only messages.** Messages are never edited or deleted. `branchedAt` depends on this invariant — don't break it.
