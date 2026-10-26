# Walkthrough iterations

A running log of how the onboarding walkthrough has evolved, newest first. Each entry names the commit, so any earlier version can be looked at or restored with `git show <hash>` or `git checkout <hash> -- <file>`.

Where it lives: `src/components/onboarding/` (`walkthrough.tsx` the dialog, `tour.tsx` the slides, `make-it-yours.tsx` the settings step, `tour.tsx` also holds the Ask then Branch simulated chat). It opens over Get started with `/get-started?tour=1`, which onboarding links to when it finishes.

## Ask then Branch illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 7 | 2026-10-26 | **Tree removed; back to the simulated chat** (iteration 3) on the blue 770px panel. `three` dependency dropped. The tree versions (4–6) stay restorable from their commits | `290a75b` |
| 6 | 2026-10-26 | **3D roots, centred.** The 578px tree panel sits in the middle of the modal instead of right-aligned | `19403cd` |
| 5 | 2026-10-26 | **3D roots (three.js).** Lit greyscale root system that turns slowly; points of light stream through every root; panel 578px (25% narrower) | `01f553d` |
| 4 | 2026-10-26 | **Flat greyscale roots (SVG)**, after a photo of exposed roots; bright dashes run through the roots | `a808fdb` |
| 3 | 2026-10-23 | **Simulated chat.** Messages 40px from the top; a pill is sent, the thinking orb appears, the reply streams in; two exchanges, loops. Pills went to full 18px radius | `6b74f02` |
| 2 | 2026-10-23 | **Figma message bars.** Three `#027fff` pills (311/277/404 × 36, 13px radius, 12px 10px padding) bottom-right of the blue panel | `7792772`, `668962c` |
| 1 | 2026-10-22 | **Product previews.** A question, its answer and two branches as cards | `c5b0cc7` |

## Dialog and layout

| # | Date | Change | Commit |
|---|---|---|---|
| 12 | 2026-10-26 | Modal 20% shorter: 1040 × 502. The blue panel now fills the height above the text (770 × 246 at full size); text block stays 152 | `4d9dc36` |
| 11 | 2026-10-26 | Title 18px medium (was 24px semibold); logo tile halved to 20px; section thumbnails 40% wider (18 × 28) | `b6b7f71` |
| 10 | 2026-10-26 | Section thumbnails 70% narrower: 13 × 28 strips, 4px corners, 10px icons | `b5b60ab` |
| 9 | 2026-10-26 | Section preview becomes thumbnails, not words: a mini panel per section (dark tree, blue tour slides, light Make it yours) with a topic icon; current outlined, upcoming faded, click to jump | `3d3f943` |
| 8 | 2026-10-26 | Footer previews the sections (names, current dark, seen mid-grey, upcoming light, click to jump) instead of dots | `ab77fb0` |
| 7 | 2026-10-23 | Buttons use our 16px squircle button radius | `84d4c1b` |
| 6 | 2026-10-23 | Buttons per spec: Skip 61 × 36 + Continue 93 × 36 (`#1e1e1e`) in a 166 × 36 group; text 500 14px/143% | `5b798d9` |
| 5 | 2026-10-23 | Text block 959 × 152 (text top, actions foot); title 600 24px/133% −0.01em `#111`; body 500 14px/143% at 60%; panel 770 × 318, 16px, `#0c6bf9 → #0c67ef → #073f93`, 1px `rgba(5,85,204,0.4)` edge | `9b96e9d` |
| 4 | 2026-10-23 | Layout per design: 40px padding, logo top-left, illustration right-aligned under it, left-aligned title and body, small dots, Skip and a black Continue | `8c5646b` |
| 3 | 2026-10-23 | Modal 1040 × 628, 20px radius, white, `0 0 0 1px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)` | `69f8fd8` |
| 2 | 2026-10-22 | Moved out of onboarding into a dialog over Get started (after Pond) | `c51b21f` |
| 1 | 2026-10-22 | First version: tour slides (how it works, nodes, collaborate, teams, models) then Make it yours, as onboarding steps | `c5b0cc7`, `19f6a32` |
