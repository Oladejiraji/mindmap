# Design-System Branch Review — Pulls 2 & 3

**Branch:** `design-system`
**Range:** `7ca8a37..964404a` (~75 commits, ~80 files, ~2,800 lines added)
**Reviewed:** 2026-10-20
**Scope:** engineer review of designer-authored frontend changes

---

## Bugs

### B1. Scroll-to-bottom during streaming blocks user from reading earlier messages

`src/components/chat/branch-chat.tsx:112-115` — The scroll effect depends on `lastLength` (content length of the last message), which changes on every streaming chunk. The component tracks `awayFromBottom` state (line 104) but the effect doesn't check it — so the user gets yanked back to the bottom immediately after scrolling up.

**Fix:** gate the effect on `!awayFromBottom`, or only auto-scroll for new messages (not content length changes).

### ~~B2. Rename input cancels on blur instead of committing~~ FIXED

`src/components/shared/canvas-panel.tsx` — `onBlur={cancelRename}` discarded the user's typed name on blur. Changed to `onBlur={commitRename}`.

### B3. Loading state shared across all invite cards

`src/components/onboarding/onboarding-flow.tsx:143` — `loading={isAccepting}` is a single boolean passed to every `InviteCard`. Clicking "Accept" on one card shows loading spinners on all of them.

**Fix:** track which `invitationId` is being accepted (e.g. `acceptingId` state) and compare per card.

### ~~B4. Workspace name mutation fires on every keystroke~~ FIXED

`src/components/shared/settings-view.tsx` — Added local draft state, mutation now fires once on blur/Enter instead of per keystroke.

---

## Code quality

### Q1. `arrivals` Map in rehype plugin grows unbounded

`src/lib/rehype-stream-words.ts:24-40` — The word-arrival Map is append-only with no cleanup mechanism. During long streaming responses, entries accumulate for the component's lifetime.

### Q2. Mutable Map stored in useState

`src/components/chat/message-bubble.tsx:20` — `arrivals` is a `Map` in `useState` that's mutated externally (by the rehype plugin) without ever calling the setter. Should be `useRef`.

### Q3. Uncleared timeouts on unmount

`src/components/chat/branch-chat.tsx:88` — 600ms timeout in the `send` catch path has no cleanup. Same in `ReplyActions` (line 355) — 1500ms "copied" reset timeout. Both will warn if the component unmounts before they fire.

### ~~Q4. Project name rename trigger inaccessible to keyboard~~ FIXED

`src/components/shared/canvas-panel.tsx` — Added `role="button"`, `tabIndex={0}`, and `onKeyDown` for Enter/Space.

### Q5. DOM query by CSS class is fragile

`src/components/auth-canvas/auth-canvas.tsx:182` — `querySelector('.rounded-3xl')` to find the card element. If the class changes, the halo positioning silently breaks. Use a `data-*` attribute instead.

### Q6. `onAnimationEnd` may not fire under reduced motion

`src/components/auth-canvas/vapour-halo.tsx:83` — The halo cleanup depends on `onAnimationEnd`. If `prefers-reduced-motion` skips the animation, the event may never fire and pulses accumulate in state.

### ~~Q7. Chevron toggle missing accessible name~~ FIXED

`src/components/shared/canvas-panel.tsx` — Added `aria-label` to the expand/collapse button.

### Q8. Unsafe `as` cast on skip sentinel

`src/components/shared/sidebar/create-menu.tsx:50-53` — TypeScript cast `as { threadId: Id<"threads"> }` on the `"skip"` sentinel suppresses the type checker. If the hook's skip behavior changes, this hides a runtime bug.

---

## Backend work needed

These are frontend features from the designer's work that have UI but need backend support you haven't built yet.

| Feature | Current state | What's needed |
|---|---|---|
| "Starred" nav item | Dead button in `home-sidebar.tsx` — no handler, no click | Either remove it or add a `starred` boolean field to threads + a toggle mutation |
| Collaborators row in node panel | Hardcoded to current user, invite button disabled | No collaborator model — needs a real participants query |
| No loading skeleton for invites | `onboarding-flow.tsx:104` returns `null` while query loads | Add a skeleton or shimmer state so the form doesn't flash blank |

---

## Notes (low-priority, track as tech debt)

| # | Location | Note |
|---|---|---|
| N1 | `globals.css:258` | `corner-shape: squircle` is Safari 18+ only (progressive enhancement, non-breaking) |
| N2 | `create-menu.tsx:163` | `data-starting-style` overrides silently fight the shared `popupMotion` class |
| N3 | `floating-chat.tsx:81` | `onPointerUp` doesn't explicitly release pointer capture |
| N4 | `switch.tsx:120, 130` | Fire-and-forget `animate()` calls in event handlers not cancelled on unmount (durations are very short, negligible risk) |

---

## Summary

**4 frontend bugs** — streaming scroll trap (B1), rename-on-blur discards input (B2), shared loading state across invite cards (B3), and mutation-per-keystroke on workspace name (B4).

**8 code quality items** — memory leaks, accessibility gaps, fragile DOM queries, type safety.

**3 backend gaps** — dead UI that needs server support or removal.

### Recommended priority

1. **B1–B2** — broken UX that users will hit immediately
2. **B3–B4** — incorrect behavior, less visible
3. **Q1–Q4** — correctness and cleanup
4. **Q5–Q8, backend gaps** — hardening and planning
