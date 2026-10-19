# Design-System Branch Review

**Branch:** `design-system` (76 commits, 80 files, ~2,900 lines added)
**Reviewed:** 2026-10-19

---

## Overview

Full design-system implementation: oklch color tokens (light/dark/high-contrast), type scale, radius scale, shadow/elevation scale, Inter font swap. Plus a new UI shell (browser-style tabs, collapsible sidebar, canvas/chat toggle, node side-panel) and several new features (branching chat, canvas shortcuts, new-project composer, create menu).

**Zero backend (`convex/`) files were changed.** All new UI hooks into existing mutations and queries.

---

## Files changed

### New files (23)

| File | Purpose |
|---|---|
| `src/app/styles/colors.css` | Full oklch color token system (light, dark, high-contrast) |
| `src/app/(app)/(thread)/new/page.tsx` | Route for `/new` — renders `NewProjectComposer` |
| `src/components/canvas/canvas-shortcuts.tsx` | Keyboard shortcut hint pill on canvas |
| `src/components/canvas/zoom-controls.tsx` | Custom zoom +/- replacing React Flow defaults |
| `src/components/chat/branch-chat.tsx` | ChatGPT-style branching conversation view |
| `src/components/shared/new-project-composer.tsx` | New-project page with send-disc composer |
| `src/components/shared/node-panel.tsx` | Right-hand side panel for node details |
| `src/components/shared/tab-strip.tsx` | Browser-style tab bar (define.app style) |
| `src/components/shared/thread-shell.tsx` | Layout shell: sidebar + tabs + content + node panel |
| `src/components/shared/view-toggle.tsx` | Canvas/Chat segmented control |
| `src/components/shared/sidebar/create-menu.tsx` | "+" popover with search and project drill-down |
| `src/components/shared/sidebar/project-row.tsx` | Sidebar project row with hover actions |
| `src/components/shared/sidebar/sidebar-toggle-button.tsx` | Sidebar collapse/expand button |
| `src/components/ui/divider.tsx` | Configurable divider with size/color/orientation variants |
| `src/components/icons/canvas-view-icon.tsx` | Canvas view icon |
| `src/components/icons/chat-icon.tsx` | Chat icon |
| `src/components/icons/folder-icons.tsx` | Custom folder icons |
| `src/components/icons/new-tab-icon.tsx` | New-tab icon |
| `src/components/icons/node-tab-icon.tsx` | Node-tab icon |
| `src/components/icons/send-icon.tsx` | Up-arrow send icon |
| `src/lib/tabs.ts` | Client-only tab state via `useSyncExternalStore` + localStorage |
| `src/lib/use-stored-boolean.ts` | localStorage-backed boolean hook with cross-component sync |
| `.mcp.json` | MCP tooling config |

### Modified files (57)

Key changes:

- **`src/app/globals.css`** — Rewired to new tokens; type scale, radius scale, shadow scale, Inter font, body default to 13px
- **`src/lib/utils.ts`** — Extended `cn()` to handle custom type scale classes
- **`src/components/editor/node-editor-view.tsx`** — Rewritten: side-panel view with breadcrumb, property grid, content/chat tabs, collaborators stub
- **`src/components/chat/chat-input.tsx`** — Rich composer with context chips, speech-to-text, character counter, "+" branch menu
- **`src/components/canvas/thread-canvas.tsx`** — Canvas/Chat toggle, keyboard shortcuts, `BranchChat` integration
- **`src/components/shared/sidebar/home-sidebar.tsx`** — Full sidebar with logo, nav, project list, profile footer
- **`src/components/shared/sidebar/profile-menu.tsx`** — Redesigned account dropdown
- **All UI primitives** (`button.tsx`, `input.tsx`, `sidebar.tsx`, etc.) — Migrated to design-system tokens
- **All auth-canvas components** — Updated colors, shadows, typography
- **All canvas node components** — Updated to new token system

---

## Backend status

| UI element | Backend support |
|---|---|
| Branch chat (fork switching, sibling nav) | Existing — `nodes.createEmptyBranch`, `messages.listByNode` |
| New-project composer | Existing — `threads.create`, `chat.sendMessage` |
| Project row actions (rename, delete) | Existing mutations |
| Tab strip, sidebar collapse | Client-only (localStorage) — no backend needed |
| **"Starred" nav item** | **None — dead UI, no handler, no backend flag** |
| **Collaborators row** | **Stub — hardcoded current user, invite button disabled, no sharing model** |

---

## Findings

### Bugs (must-fix)

#### ~~1. Missing `useEffect` dependency array — `node-panel.tsx:31`~~ ✅ Fixed

~~The keydown listener `useEffect` has no dependency array, so it re-registers on every render. Should include `[open, close]` as dependencies.~~

Added `useCallback` to `close` and `[open, close]` dependency array to the `useEffect`.

#### ~~2. `useConvexMutation` wrapper — `thread-canvas.tsx:57-65`~~ ✅ Not a bug

~~Uses `useConvexMutation` for `updatePosition`, `createEmptyBranch`, `deleteLeafNode`, and `renameNode`. This directly violates the project rule.~~

`useConvexMutation` is intentional — it adds pending/error/success state that Convex's `useMutation` doesn't provide natively. Project rules updated to allow it as an exception.

#### ~~3. Speech recognition not cleaned up on unmount — `chat-input.tsx:86-103`~~ ✅ Fixed

~~If the component unmounts while listening, the `SpeechRecognition` instance keeps running and its callbacks reference stale state. Needs cleanup in a `useEffect` return.~~

Added unmount cleanup that nulls `onresult`/`onend` callbacks and stops the instance. `stopDictation` also nulls callbacks and clears the ref.

#### ~~4. Debounce timer not cleared on unmount — `node-editor-view.tsx:83`~~ ✅ Fixed

~~Raw `setTimeout` without cleanup. The mutation fires after unmount. Should clear the timeout in `useEffect` cleanup or use a ref that's cleared on unmount.~~

Added `useEffect` cleanup that clears the debounce timer on unmount.

### Cleanup (should-fix)

#### 5. Dead UI: "Starred" nav — `home-sidebar.tsx:71`

Renders a `SidebarMenuButton` with no `href`, no `onClick`, no `isActive` logic. Either remove it or hide behind a feature flag until backend support exists.

#### 6. Commented-out / dead code

- `onNodeDoubleClick` defined but commented out at `thread-canvas.tsx:340`
- Unused `MAX_MESSAGE_CONTENT = 100` at `chat-input.tsx:10`

Remove both.

#### ~~7. Duplicate `CanvasPanel` rendering~~ ✅ Not a bug

~~`CanvasPanel` is rendered in both `thread-shell.tsx` and `branch-chat.tsx`. If both mount simultaneously, two panels appear. Consolidate to one render location.~~

The floating variant returns `null` when in chat view, and the docked variant only renders in chat view. They swap, never overlap.

### Minor (note for later)

#### 8. Client-side project naming — `new-project-composer.tsx`

`nameFrom()` derives a project name from message text on the client. If the backend ever names projects differently, these diverge. Consider moving to the backend.

#### 9. Unconditional thread subscription — `create-menu.tsx`

`useThreads()` runs even when the popover is closed, maintaining a live Convex subscription for the full thread list at all times.

#### 10. Projects capped at 12 in sidebar — `home-sidebar.tsx:42`

`slice(0, 12)` with no "show all" or pagination. Users with many projects can't reach the rest from the sidebar.

#### 11. Fragile ID parsing — `node-panel.tsx:17`

Regex match result cast directly to `Id<"threads">` with no validation that the captured group is a valid Convex ID.

#### 12. Fingerprint-based sync — `thread-canvas.tsx:174`

Builds a string from all node data to detect changes. O(n) on every render; string can grow large for big trees. A targeted comparison (length + last-modified) would be more efficient.

---

## Verdict

The design-system foundation is solid — proper token architecture, oklch colors, good light/dark separation, well-structured type and radius scales. The structural UI changes (tab strip, sidebar, shell layout) are ambitious but coherent. No backend work is behind — everything hooks into existing Convex functions correctly.

**Action items:** Fix findings 1-4 (bugs), clean up 5-7, and track 8-12 as technical debt.
