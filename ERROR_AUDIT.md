# Error Handling Audit

Audited: 2026-04-17. After the toast wiring pass (sonner + `showError` helper, all known fire-and-forget mutations now `.catch(showError)`).

Findings below are new — overlap with `REVIEW_ISSUES.md` (§4.7, §4.8, §4.11, §4.12) is omitted.

---

## Medium

### M1. Query errors never surfaced

React Query exposes `error` / `isError`, but two hot-path queries never read them. A failure silently renders an empty state.

- [src/services/messages/queries.ts:33-49](src/services/messages/queries.ts#L33-L49) — `useNodeContextMessages` runs `useQueries` over the ancestor chain and only reads `.data`. One failed ancestor fetch → chat renders with missing context, no indication.
- [src/components/shared/sidebar/app-sidebar.tsx:18](src/components/shared/sidebar/app-sidebar.tsx#L18) — `useThreads()` error is never checked. Backend hiccup shows as "No chats yet."

**Fix:** check `isError` / `error` at each call site. Either (a) toast once on transition to error state, or (b) render an inline error UI with a retry button. Guard the toast so it doesn't re-fire on every re-subscribe.

### M2. `sendMessage` action parallel error handling is asymmetric

[convex/chat.ts:15-34](convex/chat.ts#L15-L34) fires `streamAssistantResponse` + `maybeGenerateTitle` in parallel. `maybeGenerateTitle` swallows its own error; `streamAssistantResponse` propagates.

Currently the client catches the rejection via `showError` on the calling hook, so this is arguably **not a bug** — stream failures correctly surface. Worth keeping an eye on: if we add more parallel side-effects here later, one failure will still cancel the sibling's awaited result.

**Fix (if/when needed):** switch to `Promise.allSettled` and decide per-task whether to rethrow.

---

## Low

### L1. No `error.tsx` / `global-error.tsx`

Next.js App Router supports per-route error UI. We have none. An uncaught render-time error (malformed markdown, React Flow edge case, etc.) nukes the page with the default framework error screen.

**Fix:** add `src/app/error.tsx` — a thin "Something went wrong" UI with a `reset()` retry button. Optional second file at `global-error.tsx` for root-layout-level crashes.

### L2. `showError` doesn't parse `ConvexError.data`

[src/lib/toast.ts:11-20](src/lib/toast.ts#L11-L20) only reads `.message`. Today every Convex throw is a plain `Error`, so it works. The moment we start using `ConvexError` with structured payloads (typed codes, field-level errors), messages render as `[object Object]`.

**Fix:** detect `ConvexError` and pull `error.data.message` before falling back to `.message`.

### L3. `node-chat.tsx` `isSending` flipped in `finally`

[src/components/shared/chat/node-chat.tsx:32-34](src/components/shared/chat/node-chat.tsx#L32-L34) — send fails → `isSending=false` immediately → user can mash the send button and re-fire before the toast is even readable. Low impact, but a 400–600 ms debounce or an explicit "retry" affordance would be nicer.

---

## Triage

Start with **M1** — actual silent failures users can hit today. **L1** is cheap polish. Others can wait.
