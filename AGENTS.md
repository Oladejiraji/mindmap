<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Mindmap

A branching chat app. Conversations are a tree of nodes; each node is a whole chat. Children inherit parent context up to a branch point and stay isolated from siblings. See [SPEC.md](./SPEC.md) for the full data model and rationale.

## Non-negotiables

- **Package manager: pnpm.** Never use `npm` or `yarn`. All install/run commands go through `pnpm`.
- **Messages are append-only.** No edits, no deletes. Ever. The `branchedAt` index depends on this — breaking the invariant silently corrupts every descendant's context.
- **Auth checks are manual.** Convex has no row-level security. Every query/mutation that touches a `node` or `message` must verify ownership via the thread/node's `userId`.
- **LLM calls happen in Convex actions**, not mutations or queries. Actions read context via `ctx.runQuery` and write results via `ctx.runMutation`.

## Stack notes

- **Backend: Convex.** Schema and functions live in `convex/`. Mutations for writes (transactional), queries for reads (reactive), actions for external/LLM calls (non-reactive).
- **Tailwind v4.** No `tailwind.config.ts`. Plugins and theme are declared in `src/app/globals.css` via `@import`, `@plugin`, and `@theme`. `tailwindcss-motion` is already wired there.
- **React Flow CSS.** When you first use `@xyflow/react`, import its stylesheet once at the top of the component that renders the canvas: `import "@xyflow/react/dist/style.css";`.

## Frontend guidelines

- **Avoid `useEffect` as much as possible.** Before reaching for one, read [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — it lists the exact patterns where `useEffect` is the wrong tool. Most "I need an effect" situations are actually one of: transforming data for rendering (use `useMemo` or compute inline), responding to user input (use an event handler), or caching expensive computation (use `useMemo`). Legitimate uses are narrow: synchronizing with an external (non-React) system, subscribing to a browser API, or running cleanup on unmount. If your effect fires a fetch, updates state based on props, or resets state when something changes — it's probably the wrong tool.
- **Use `@base-ui/react` patterns, not Radix.** This project uses shadcn's `base-nova` style with `@base-ui/react` as the primitive layer. Use the `render` prop for polymorphism (e.g., `render={<Link href="..." />}`), not `asChild` which is a Radix concept.

## Design principles

- **Minimal design.** Strip out everything that isn't essential. No decorative elements, no heavy borders, no excess padding.
- **Good typography and hierarchy.** Use font weight, size, and color to establish clear visual hierarchy. Headlines should be noticeably distinct from body text without being loud.
- **Prefer smaller font sizes.** Default to `text-sm` (14px) for body content and UI controls. Use `text-xs` (12px) for secondary/meta information. Reserve `text-base` (16px) and above for page titles and headers only.
- **Let spacing do the work.** Use whitespace and grouping to communicate structure, not lines or boxes. When two things look related, proximity handles it — an extra border or background is noise.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
