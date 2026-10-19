# Design-System Branch Review (v2)

**Branch:** `design-system` (~126 commits, 118 files, ~5,200 lines added)
**Reviewed:** 2026-10-19

---

## Overview

Design-system foundation (oklch tokens, type scale, radius, shadows, Inter font) plus a major UI overhaul: browser-style tabs, collapsible sidebar, canvas/chat toggle, node side-panel, settings pages, B2B onboarding flow, get-started page, branching chat, and canvas shortcuts.

**Backend changes are minimal** — two small tweaks to `convex/threads.ts` and `convex/lib/llm.ts`. Both are correct and safe.

---

## Backend status

### Changes made (correct, safe)

- **`convex/threads.ts`** — `create` now accepts optional `name` (was required), falls back to `"Untitled"`. Backward-compatible.
- **`convex/lib/llm.ts`** — When the root node gets an auto-generated title, the thread is also renamed to match. Inside existing try/catch. Uses `api.threads.rename` which does its own auth check.

### Backend that doesn't exist yet

The spec at `doc/onboarding-orgs-spec.md` describes significant backend work that is entirely absent:

| Spec item | Status |
|---|---|
| `organizations` table | Not in schema |
| `memberships` table | Not in schema |
| `invites` table | Not in schema |
| `users.onboardedAt` field | Not in schema |
| `threads.orgId` field | Not in schema |
| `organizations.createWithOnboarding` | Not implemented |
| `organizations.update` / `.current` | Not implemented |
| `memberships.updateJobRole` | Not implemented |
| `invites.create` / `accept` / `revoke` | Not implemented |
| `requireThreadAccess` (replaces per-user ownership) | Not started |
| Onboarding gate (redirect un-onboarded users) | Not wired |

**All onboarding, teams, and settings data currently lives in localStorage only.** The UI collects B2B data and stores it nowhere durable.

### Existing features with no backend gap

| UI feature | Backend support |
|---|---|
| Branch chat (fork switching, sibling nav) | Existing — `nodes.createEmptyBranch`, `messages.listByNode` |
| New-project composer | Existing — `threads.create`, `chat.sendMessage` |
| Project row actions (rename, delete) | Existing mutations |
| Tab strip, sidebar collapse | Client-only localStorage — no backend needed |
| Canvas shortcuts, zoom controls | Client-only — no backend needed |
| Collaborators row in node panel | Stub — hardcoded to current user, invite disabled |
| "Starred" nav item | Dead — no handler, no backend flag |

### Deleted route

`src/app/(app)/(thread)/t/[threadId]/n/[nodeId]/page.tsx` was removed. Nodes now open as a side panel via `?panel=<nodeId>`. **No broken references** — grep confirms zero hits for the old pattern.

---

## New routes

All route pages exist. All imported components resolve.

| Route | Path | Status |
|---|---|---|
| `getStarted` | `/get-started` | Real — renders `<GetStarted />` |
| `settings` | `/settings` | Redirects to `/settings/account` |
| `settingsAccount` | `/settings/account` | Real — `<AccountSettings />` |
| `settingsPreferences` | `/settings/preferences` | Real — `<PreferencesSettings />` |
| `settingsGeneral` | `/settings/general` | Real — `<GeneralSettings />` |
| `settingsHotkeys` | `/settings/hotkeys` | Real — `<HotkeysSettings />` |
| `onboarding` | `/onboarding` | Real — `<OnboardingFlow />` |
| `newProject` | `/new` | Real — `<NewProjectComposer />` |

---

## Findings

### Bugs (must-fix)

#### ~~1. `useConvexMutation` wrapper used in 3 files~~ FIXED

Replaced with direct `useMutation` calls in `thread-canvas.tsx`, `project-card.tsx`, `project-row.tsx`, `edit-dropdown.tsx`, `sidebar/project-row.tsx`. `useRenameThread` refactored to use `useMutation().withOptimisticUpdate()`. `useConvexMutation` kept only in `page.tsx` where `isPending` is needed for button loading state.

#### ~~2. Autofill text invisible in light mode — `globals.css`~~ FIXED

Changed hardcoded `#fff` text and `white` background to `var(--fg-primary)` and `var(--background)` so autofill adapts to any theme.

#### 3. Hardcoded `bg-white` on leaf nodes — `leaf-node.tsx:22`

Won't work if dark mode is enabled. Should use a semantic token like `bg-surface-container`.

#### ~~4. Switch animation has no cleanup — `switch.tsx`~~ FIXED

Added `activeAnimation` ref tracking, a `cancelled` flag, and a cleanup function that calls `.stop()` on unmount. Previous animation is also stopped when `checked` changes mid-flight.

#### 5. Mutable render-time index in `create-menu.tsx:133`

`let index = -1` is incremented inside JSX render. Works in sync mode but breaks under React concurrent rendering. Refactor to use `flatMap` with proper indexing.

### Cleanup (should-fix)

#### 6. Dead code: `onNodeDoubleClick` — `thread-canvas.tsx`

Callback is defined but commented out at the usage site (line ~286). Remove both the definition and the commented reference.

#### 7. Dead UI: "Starred" nav — `home-sidebar.tsx:83`

`SidebarMenuButton` with no `href`, no `onClick`, no tooltip. Either remove or add a "coming soon" indicator.

#### 8. Sign-up page legal links — `sign-up/page.tsx`

Mentions "Terms of Use" and "Privacy Policy" but they're plain text, not links. Potential legal issue.

#### 9. Projects capped at 12 in sidebar — `home-sidebar.tsx`

`slice(0, 12)` with no "show more" button or indication that more projects exist.

#### 10. Hardcoded dark theme colors on sign-up page — `sign-up/page.tsx`

Uses `text-white`, `text-background/87`, `bg-sidebar-ring` on a dark gradient background. Will break if the theme system changes.

#### 11. Settings shell instantiates React elements at module scope — `settings-shell.tsx`

`PAGES` creates `<UserAvatar size={16} />` at module level. If `UserAvatar` ever takes reactive props (real avatar URL), this breaks. Move into a render function.

#### 12. `field-sizing-content` on chat textarea — `chat-input.tsx:185`

Very new CSS property with limited browser support. May not work in Safari or older browsers. Add a fallback.

### Minor (note for later)

#### 13. `corner-shape: squircle` applied universally — `globals.css:262`

Cutting-edge CSS with very limited browser support. Progressive enhancement is fine, but test on target browsers.

#### 14. Get-started page cards 2 and 3 are not clickable

Only the first card has an `href`. The other two are decorative dead-ends.

#### 15. Tab preview fires a query on every hover — `tab-preview.tsx`

No debounce. Could be expensive if users hover tabs rapidly.

#### 16. Fingerprint-based sync in `use-sync-convex-to-flow.ts`

Concatenates all node data into a string for change detection. O(n) on every render. Fine for small trees, won't scale.

#### 17. Team color assignment unstable — `teams.ts`

Color is based on `current.length % palette.length`. Deleting a team shifts colors for all subsequent teams.

#### 18. Hotkeys settings page and `useCanvasShortcuts` have no shared source of truth

Shortcuts are hardcoded in both places independently. If one changes, the other goes stale.

#### 19. `CHANGELOG_URL` in settings shell points to GitHub commits page

Not a real changelog. Either link to actual release notes or remove.

#### 20. Breadcrumb links in node panel open nested panels

`routes.node(threadId, parent._id)` in `node-editor-view.tsx` navigates to `?panel=<nodeId>`. Clicking a breadcrumb in the panel replaces the current panel — may be unexpected UX.

---

## New files inventory

### Components (30 new)

| File | Purpose |
|---|---|
| `src/components/onboarding/onboarding-flow.tsx` | B2B onboarding wizard (org, role, use case) |
| `src/components/shared/get-started.tsx` | Welcome page with tutorial cards |
| `src/components/shared/settings-shell.tsx` | Settings layout shell |
| `src/components/shared/settings-view.tsx` | Account, Preferences, General, Hotkeys pages |
| `src/components/shared/tab-preview.tsx` | Tab hover preview |
| `src/components/shared/tab-strip.tsx` | Browser-style tab bar |
| `src/components/shared/thread-shell.tsx` | Thread page layout wrapper |
| `src/components/shared/user-avatar.tsx` | Gradient circle avatar placeholder |
| `src/components/shared/view-toggle.tsx` | Canvas/Chat segmented control |
| `src/components/shared/node-panel.tsx` | Node detail side panel |
| `src/components/shared/new-project-composer.tsx` | Chat-first project creation |
| `src/components/canvas/canvas-shortcuts.tsx` | Keyboard shortcut hint pill |
| `src/components/canvas/zoom-controls.tsx` | Custom zoom +/- buttons |
| `src/components/chat/branch-chat.tsx` | ChatGPT-style branching conversation |
| `src/components/shared/sidebar/create-menu.tsx` | "+" popover with search |
| `src/components/shared/sidebar/project-row.tsx` | Project row with hover actions |
| `src/components/shared/sidebar/sidebar-toggle-button.tsx` | Sidebar collapse button |
| `src/components/shared/sidebar/popover-styles.ts` | Shared popover CSS constants |
| `src/components/ui/divider.tsx` | Configurable divider component |
| `src/components/ui/switch.tsx` | Gooey animated toggle |
| `src/components/icons/billing-icon.tsx` | Billing icon |
| `src/components/icons/canvas-view-icon.tsx` | Canvas view icon |
| `src/components/icons/chat-icon.tsx` | Chat icon |
| `src/components/icons/close-icon.tsx` | Close (x) icon |
| `src/components/icons/flame-icon.tsx` | Flame icon |
| `src/components/icons/folder-icons.tsx` | Folder icons |
| `src/components/icons/grid-icon.tsx` | Grid icon |
| `src/components/icons/hotkeys-icon.tsx` | Hotkeys icon |
| `src/components/icons/invite-icon.tsx` | Invite icon |
| `src/components/icons/list-icon.tsx` | List icon |
| `src/components/icons/models-icon.tsx` | Models icon |
| `src/components/icons/new-tab-icon.tsx` | New-tab icon |
| `src/components/icons/node-tab-icon.tsx` | Node-tab icon |
| `src/components/icons/personalization-icon.tsx` | Personalization icon |
| `src/components/icons/preferences-icon.tsx` | Preferences icon |
| `src/components/icons/send-icon.tsx` | Send arrow icon |
| `src/components/icons/settings-gear-icon.tsx` | Settings gear icon |

### Hooks and lib (7 new)

| File | Purpose |
|---|---|
| `src/hooks/use-canvas-shortcuts.ts` | Canvas keyboard shortcut handler |
| `src/hooks/use-sync-convex-to-flow.ts` | Convex → ReactFlow state sync |
| `src/lib/onboarding.ts` | Onboarding state (localStorage) |
| `src/lib/preferences.ts` | User preferences (localStorage) |
| `src/lib/teams.ts` | Teams CRUD (localStorage) |
| `src/lib/tabs.ts` | Tab state management (localStorage) |
| `src/lib/use-stored-boolean.ts` | Generic localStorage boolean hook |

### Routes (8 new)

| File | Purpose |
|---|---|
| `src/app/(app)/(home)/get-started/page.tsx` | Get-started page |
| `src/app/(app)/(onboarding)/onboarding/page.tsx` | Onboarding page |
| `src/app/(app)/(settings)/settings/layout.tsx` | Settings layout |
| `src/app/(app)/(settings)/settings/page.tsx` | Settings index (redirects to account) |
| `src/app/(app)/(settings)/settings/account/page.tsx` | Account settings |
| `src/app/(app)/(settings)/settings/general/page.tsx` | General settings |
| `src/app/(app)/(settings)/settings/hotkeys/page.tsx` | Hotkeys settings |
| `src/app/(app)/(settings)/settings/preferences/page.tsx` | Preferences settings |
| `src/app/(app)/(thread)/new/page.tsx` | New project page |

### Other

| File | Purpose |
|---|---|
| `doc/onboarding-orgs-spec.md` | Backend spec for organizations |
| `src/app/fonts/inter-display-500.woff2` | Inter Display font file |
| `src/app/styles/colors.css` | Full oklch color token system |
| `.mcp.json` | MCP tooling config |

---

## Verdict

The design-system foundation and structural UI work are solid. The backend changes are minimal and correct. The biggest gap is that all B2B features (onboarding, teams, settings) live entirely in localStorage with no server persistence — the spec exists but zero Convex work has been done.

**Priority for cleanup before adding backend:**
1. Fix findings 1–5 (bugs that affect correctness)
2. Clean up findings 6–12 (dead code, dead UI, fragile patterns)
3. Track findings 13–20 as tech debt
