# Mindmap

A spatial thinking tool where you build structured knowledge through AI-assisted exploration. Each node is a research unit with rich, editable block content. Nodes form a tree on an infinite canvas — children inherit parent context through block content, not chat transcripts.

Think of it as a company brain you build deliberately through active thinking.

See [SPEC.md](./doc/SPEC.md) for the full product spec, data model, and architecture decisions.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Convex** — backend, database, and auth
- **React Flow** (`@xyflow/react`) — spatial canvas
- **BlockNote** — Notion-like block editor for node content
- **Tailwind CSS v4** + **tailwindcss-motion** — styling and animation
- **shadcn/ui** (`base-nova` style) — component primitives

## Getting started

```bash
pnpm install
pnpm convex dev     # in one terminal — starts the Convex backend
pnpm dev            # in another — starts Next.js
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

**Frontend** (`.env.local` — `pnpm convex dev` populates these on first run):

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

See `.env.example` for the shape.

**Backend** (Convex deployment env — set via CLI, not `.env.local`):

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-...
```

## Project layout

```
src/app/           Next.js routes (App Router)
convex/            Convex functions (queries, mutations, actions) and schema
src/components/    UI components (shadcn lives in src/components/ui)
doc/               Product spec and reference docs
```
