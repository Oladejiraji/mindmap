# Mindmap

A chat app where conversations branch like a mindmap. When a thread goes deep on a tangent, you fork into a child node instead of polluting the parent — each branch inherits its parent's context up to the branch point and stays isolated from siblings.

Built for learning: when a single linear chat forces you to choose between "go deeper here" and "keep the main thread clean," a tree of chats fixes that.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Convex** — backend, database, and auth
- **React Flow** (`@xyflow/react`) — mindmap visualization
- **Tailwind CSS v4** + **tailwindcss-motion** — styling and animation
- **shadcn/ui** — component primitives

## Getting started

```bash
pnpm install
pnpm convex dev     # in one terminal — starts the Convex backend
pnpm dev            # in another — starts Next.js
```

Open [http://localhost:3000](http://localhost:3000).

## Project layout

```
src/app/           Next.js routes (App Router)
convex/            Convex functions (queries, mutations, actions) and schema
src/components/    UI components (shadcn lives in src/components/ui)
```

## Design

See [SPEC.md](./SPEC.md) for the data model, branching semantics, and the decisions behind them. Read it before touching the schema — several design choices have subtle implications (append-only messages, frozen-prefix branching, etc.).
