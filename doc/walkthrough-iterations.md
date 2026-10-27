# Walkthrough iterations

A running log of how the onboarding walkthrough has evolved, newest first. Each entry names the commit, so any earlier version can be looked at or restored with `git show <hash>` or `git checkout <hash> -- <file>`.

Where it lives: `src/components/onboarding/` (`walkthrough.tsx` the dialog, `tour.tsx` the slides, `make-it-yours.tsx` the settings step, `tour.tsx` also holds the Ask then Branch simulated chat). It opens over Get started with `/get-started?tour=1`, which onboarding links to when it finishes.

## Ask then Branch illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 19 | 2026-10-27 | Panel background a step lighter: `oklch(0.985 0 0)` | `b444803` |
| 18 | 2026-10-27 | Panel background lighter: #f3f3f3 (~oklch 0.966) → `oklch(0.975 0 0)` | `5d8e0d5` |
| 17 | 2026-10-27 | Grey tracks lighter again: `oklch(0.96 0 0)`, just under the panel's ~0.966 | `71c6310` |
| 16 | 2026-10-27 | Grey tracks even lighter: `oklch(0.95 0 0)` | `18744dd` |
| 15 | 2026-10-27 | Grey tracks (and the square's grey edge) lighter: `oklch(0.9 0 0)` → `oklch(0.93 0 0)` on the #f3f3f3 panel | `ae07e54` |
| 14 | 2026-10-27 | **Follow the blue line.** After the converge, the camera pans with the blue line's head (line and camera move at the same steady speed, so the head holds 420px in). Four 12px nodes (white, blue edge) pop up on the line as the head passes, each growing one or two faded branches (blue at 30%). Loop is now 10s; fades out at the end and restarts at the converge | `26737dc` |
| 13 | 2026-10-27 | **Roles reversed: converge.** Five coloured lines run in together from dots on the left and converge on the square (now right of centre); their strike is the impact, drawing a blue edge from the contact point round the square. One blue line then draws out to the right. The square and the line out are barely there (30%) and have no blue until the strike. Removed the after-effects (spark glow, nudge, ring, tint) | `b83132e` |
| 12 | 2026-10-27 | Panel background #f5f5f5 → #f3f3f3 | `480a5cf` |
| 11 | 2026-10-27 | **Impact from the line, understated.** The streak speeds up into the square, its head stays against it and nudges it 2px (eased back, no squash or bounce), and its tail collapses into the square. Square: blue edge, faint `oklch(0.97 0.02 262)` tint; soft 1px ring to 1.45×, gone in ~400ms | `fbeb013` |
| 10 | 2026-10-27 | **Branch streak, with impact.** The square and the five branch tracks sit at 30% until the streak hits; on impact the square is knocked 5px and squashed (0.84 × 1.12), springs back, flashes light blue (`oklch(0.93 0.05 262)`) and takes a blue edge, and a blue ring ripples off it | `86b9636` |
| 9 | 2026-10-27 | **Branch streak** (`branch-streak.tsx`). On the #f5f5f5 panel: a blue streak runs along a faint track into a 32px square (which pulses, edge turns blue), then five lines branch off it and draw out, each ending in a dot. Branch colours in OKLCH around our blue's complement (brand hue 262 → 82), 25° apart: coral 32, orange 57, amber 82, chartreuse 107, green 132. 4.8s loop; reduced motion shows the finished picture | `997c53e` |
| 8 | 2026-10-26 | **Empty placeholder.** The panel is a plain 578 × 318 `#f5f5f5` container for now. The blue panel with the chat is saved: the previews stay in `tour.tsx`, and the blue panel can be restored from `e7ee4a3` | `2c666f9` |
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
| 24 | 2026-10-27 | First slide title "Ask then Branch" → "Research with the team" (body unchanged) | `af568e3` |
| 23 | 2026-10-27 | Logo back to 32px (keeps the smaller 10px m and 10px corners). Coming soon badge is a 20px chip, centred on the title | `9fd9446` |
| 22 | 2026-10-27 | Logo tile 64px, 10px corners, smaller m (20px, 31% of the tile). Coming soon badges get Antalik's shimmer from libraries.dev/orbs (dark band on a tertiary-grey label, 2s linear; off for reduced motion) | `8599984` |
| 21 | 2026-10-26 | Skip removed (Esc or clicking outside still close it); the 166px button group goes with it, so Back sits 8px from Continue | `c3b05e0` |
| 20 | 2026-10-26 | Slide body text 13px/18px, regular | `46eed1b` |
| 19 | 2026-10-26 | Slide body text regular (400), 14px/143% | `79ebd35` |
| 18 | 2026-10-26 | Continue button 93 × 32 with 13px text; slide title back to its original 24px (weight stays 500) | `d0b2f2f` |
| 17 | 2026-10-26 | Logo moved from the top-left corner to above each step's title: 32px tile (10px corners), 16px to the title; centred over Make it yours | `f3e26a0` |
| 16 | 2026-10-26 | Step dots 40% larger: 5.6px, 5.6px apart | `697156e` |
| 15 | 2026-10-26 | Back to the original 1040 × 628; section thumbnails back to the step dots | `2c666f9` |
| 14 | 2026-10-26 | Text and panel on one line: title and body on the left, the 578 × 318 panel on the right, vertically centred on each other, 40px apart. Footer is just the section thumbnails and actions (the 152px text block is gone) | `e7ee4a3` |
| 13 | 2026-10-26 | Slide text centred in the frame (460px block, still left-aligned); blue panel 25% narrower, 578px, still right-aligned | `4e64778` |
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
