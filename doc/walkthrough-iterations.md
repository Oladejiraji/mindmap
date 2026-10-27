# Walkthrough iterations

A running log of how the onboarding walkthrough has evolved, newest first. Each entry names the commit, so any earlier version can be looked at or restored with `git show <hash>` or `git checkout <hash> -- <file>`.

Where it lives: `src/components/onboarding/` (`walkthrough.tsx` the dialog, `tour.tsx` the slides, `make-it-yours.tsx` the settings step, `tour.tsx` also holds the Ask then Branch simulated chat). It opens over Get started with `/get-started?tour=1`, which onboarding links to when it finishes.

## Ask then Branch illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 37 | 2026-10-27 | **Four slides.** Teams, Choose your model and Make it yours archived (kept in `ARCHIVED_TOUR` in tour.tsx and make-it-yours.tsx). New last slide "The canvas awaits" (body: "Start with a question and watch your research take shape.", panel empty for now); its CTA reads "Get started" (button min 93px wide) and closes onto Get started. Four step dots | `24e0778` |
| 36 | 2026-10-27 | The square's edge on impact is a gradient like the pulse, not plain blue: coral → amber → green (the struck colours) on the left into our blue on the right, where the blue line leaves | `8cf1646` |
| 35 | 2026-10-27 | Second slide body: "Everyone can work on the same goal, on different parts. All your research can be traced and seen in real time." | `cb85b61` |
| 34 | 2026-10-27 | Text box 32px tall (was 36) | `ac1ca7c` |
| 33 | 2026-10-27 | Second slide title "Create nodes" → "Your team's research in one place" (body unchanged) | `7e6de5f` |
| 32 | 2026-10-27 | **Visuals transition.** On Continue the panel's visuals (not the panel or text), after the slide's own exit, scale to 0.96 and blur 6px, then fade (420ms). The next slide's visuals come in from 0.97 scale, 6px blur and transparent, sharpening (360ms). Reduced motion: none | `595632e` |
| 31 | 2026-10-27 | **Line carries into the next slide.** On Continue, the first slide snaps to its finished picture and the blue line runs on out of the text box and off the panel's right edge (0.45s, speeding up); then Create nodes comes in and the line enters its panel from the left edge at the same height, easing to a stop mid-panel. Reduced motion skips the exit | `d53cce2` |
| 30 | 2026-10-27 | Text box hidden (0%, was 30%) until the blue line reaches it, then fades in over 0.15s | `5dbaf73` |
| 29 | 2026-10-27 | Text box pulse residue reduced: its fringe settles at 18% and leaves a 6% rim (was 30% / 21%), gone by 75% of the effect; the auth page's own pulse unchanged | `a0e2b9a` |
| 28 | 2026-10-27 | **The auth page's pulse.** The VapourHalo from the auth canvas (pastel washes losing steam, the dot pattern the wave reveals, a chromatic fringe) fires on the square when it's fully lit (1.64s) and on the text box when the blue has filled it (5.25s). Drawn on a 578 × 318 layer behind the SVG, scaled with it; timed from the loop's own animation events; fades with the loop and clears on restart; off for reduced motion | `dbc8db5` |
| 27 | 2026-10-27 | Subtle layered shadow under the blue text box (interfaces.dev: layered shadows for depth), tinted with the brand blue: `0 1px 2px` at 16% + `0 4px 12px` at 14%; grows in with the blue wipe | `7227b5d` |
| 26 | 2026-10-27 | **A process, step to step.** The square stays faint and colourless until the lines hit; the blue edge then travels round it over 0.6s and the square lights up behind it (left to right), and only then does the blue line leave. The text box: one blue stroke starts at its left side and runs the whole way round, once (0.8s), then blue flows in from the left. Loop 7s | `fde1889` |
| 25 | 2026-10-27 | **Pulse and send, smooth.** Two soft blue stroke pulses (0.6s each, sine ease in-out), then blue flows into the box from the left (0.6s wipe, the way the blue line arrives) revealing the question in white. A wipe instead of a colour fade, so no washed-out in-between colours; the caret fades as the blue arrives | `94627c0` |
| 24 | 2026-10-27 | Pulse-and-fill reverted (didn't work); back to iteration 22: typed question with a blinking caret | `54fd0e3` |
| 23 | 2026-10-27 | After typing, the text box pulses a 1.5px blue stroke twice (~0.36s each), then fills with our blue as the text turns white; the caret blinks through the pulses and goes when it fills | `61bc535` |
| 22 | 2026-10-27 | Text box types "What does Mindmap do?" (Inter 13px, `oklch(0.4 0 0)`), one character at a time over ~1.3s, with the blue caret stepping after each (positions measured per glyph), then blinking. Field widened to 180 (x 350) so the phrase fits | `b7f9796` |
| 21 | 2026-10-27 | Text box fill lighter: `oklch(0.93 0 0)` → `oklch(0.955 0 0)` | `268c5b8` |
| 20 | 2026-10-27 | **Into a text box.** No more follow-the-line nodes (kept in 26737dc): the blue line runs from the square (moved left, x 236) into a text field at Apple's iOS size, 36pt tall with 10pt corners, darker grey fill `oklch(0.93 0 0)`, no border, 88px from the square, 48px right margin. A line of text writes in behind iOS's blue caret, which then blinks. 6s loop | `29c5afc` |
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

## Create nodes illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 25 | 2026-10-27 | **Lists close up.** Each card's list, 1.5s after it has written in, closes up into its card like an accordion (grid rows 1fr → 0fr with a fade, 420ms ease-in-out); Kurosawa's first, then the forks'. Reduced motion keeps them open | `edb69ed` |
| 24 | 2026-10-27 | Kurosawa's own photo (public/walkthrough/kurosawa.png); all three researchers now use their own photos | `0e3c442` |
| 23 | 2026-10-27 | Purple and amber reviewed in OKLCH against our blue (0.558 0.226 262): purple `oklch(0.58 0.21 300)` (was 0.62 0.19 295, near the blue's lightness and chroma); amber `oklch(0.76 0.16 75)` (was 0.8 0.16 82, a deeper golden amber that holds on the light panel). Pulse tints follow | `97fa45c` |
| 22 | 2026-10-27 | Connectors in the ring colour of the person they lead to (Deji purple, Stephen amber; the line in to Kurosawa stays blue). Pulse is a gradient along the connector, our blue at the project shading to a light tint of the fork's colour, with a glow in that colour | `6446569` |
| 21 | 2026-10-27 | Under Core features: Forked, "Core features for MVP", then "Collaboration · Clarity · Tracking"; the card moves up 8px so the list fits | `8be8dcb` |
| 20 | 2026-10-27 | Core features lists the features it forks, "Collaboration · Clarity · Tracking", after Forked. Deji's ring purple, `oklch(0.62 0.19 295)` (was coral) | `9a4663e` |
| 19 | 2026-10-27 | **Pulse before Forked.** After each fork card appears, a pulse (a short near-white streak with a soft blue glow, 0.6s) runs along its connector from the project to it; the fork's notes, "Forked" first, appear as it arrives | `c2bbc0c` |
| 18 | 2026-10-27 | Notes under every card, in the same style, not inside them: the project keeps "Reviewed 12 research tools" + Competitor research (Linear, ClickUp, Notion); User interviews gets "Forked" (node symbol) + "User interviews at big tech" (Meta, Netflix, Google); Core features gets "Forked". Branch cards back to 32px pills | `ccc95a4` |
| 17 | 2026-10-27 | Second fork is "Core features" (forking the group research tool's features). Card titles in a near-black with a faint blue tint, `oklch(0.22 0.012 262)` | `a5a4539` |
| 16 | 2026-10-27 | Deji's and Stephen's own photos (public/walkthrough/) | `da0e991` |
| 15 | 2026-10-27 | **Samples and forks.** Under the project card: "Reviewed 12 research tools", "User interviews at big tech" with Meta, Netflix and Google logos, "Competitor research" with Linear, ClickUp and Notion (labels on their own line, logos below). Branch cards say "Forked" with the node symbol under their title (52px tall, 238 wide); the second is "Competitor research and analysis". Layout rebalanced: project card x 40 / 210 wide, branch cards x 300 | `1aeea36` |
| 14 | 2026-10-27 | Tool row starts with "Samples" (same grey), then the three logos | `4f2c918` |
| 13 | 2026-10-27 | The nexus line becomes sample tools reviewed: Linear, ClickUp and Notion, each with its 12px mark in brand colour (Simple Icons, `tool-logos.tsx`) and its name in the notes' grey | `ca73516` |
| 12 | 2026-10-27 | "is researching…" in the notes' type and grey (12/16 regular, `oklch(0.68 0 0)`), shimmer switched to the grey Antalik one (band `oklch(0.45 0 0)`) | `34d5efc` |
| 11 | 2026-10-27 | List regular (was medium) in a lighter grey, `oklch(0.68 0 0)` (was 0.55). Photo rings: Kurosawa keeps our blue; Deji coral `oklch(0.7 0.18 32)` and Stephen amber `oklch(0.8 0.16 82)`, from slide 1's complementary palette | `ed3fbe5` |
| 10 | 2026-10-27 | Bullets removed from the list; lines align with the card title | `c610cbd` |
| 9 | 2026-10-27 | The work/nexus list moves out of the project card to sit under it on the panel (8px below); the card is back to a 32px pill like the others | `acb3b75` |
| 8 | 2026-10-27 | "is researching…" 12px/16px medium (was caption size, regular) | `7ea1d2b` |
| 7 | 2026-10-27 | Project card lists its work and nexus points: Reviewed 12 research tools, Synthesised 6 team interviews, Nexus: teams lose context. 12px/16px medium, `oklch(0.55 0 0)`; grey bullets for work, a blue bullet for the nexus point; they fade up 120ms apart after the card. Card grows to 98px, still centred on the line | `7a19d9c` |
| 6 | 2026-10-27 | Cards 32px tall (was 48), all three; still 20px squircle corners and centred on their branch ends | `37603a3` |
| 5 | 2026-10-27 | Author tags without the chip: just the 16px photo with a 1.5px brand-blue ring (1px white offset) and the name in fg-primary, then the shimmering "is researching…" | `174c266` |
| 4 | 2026-10-27 | **A project and its branches.** The line comes in to a project card, "Build a group research tool" (Kurosawa, left, 220 wide), which then branches into two cards, User interviews (Deji) and Competitor teardown (Stephen, on blue), on the right | `88f4110` |
| 3 | 2026-10-27 | Researchers renamed: Kurosawa (was Lex Porto), Deji (was Oladeji Raji), Stephen (was Felipe Rocha, still on blue); avatars unchanged | `997c59e` |
| 2 | 2026-10-27 | Node square removed: the line splits straight into the three branches (they start as it arrives, 0.56s sooner). Cards 48px tall (was 44) with our 20px squircle corners (was 12) | `51ff93b` |
| 1 | 2026-10-27 | **Branch out to people researching** (`branch-out.tsx`). Carries on from slide 1: the blue line comes in from the left edge into a 32px node, which lights up behind a travelling blue edge; three branches grow out to white cards (Pricing models, User interviews, Competitor teardown), each with an auth-canvas author chip (avatar + name: Lex Porto, Oladeji Raji, Felipe Rocha on blue) and the shimmering "is researching…". Plays once on arrival and holds | `ad7069f` |

## Think together illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 12 | 2026-10-27 | **Glitch fix.** The bow side was chosen per frame and flipped as a logo crossed the row; photos were measured every frame (sub-pixel twitch). Now a cubic curve leaves the photo vertically towards its model then sweeps into the logo, every control point continuous with the logo's position; photo centres measured once when the lines appear and on resize. Measured: max 0.9px movement per frame | `541dbce` |
| 11 | 2026-10-27 | Lines connect to the profiles: each starts at its person's photo centre, measured every frame, and runs behind it so it comes out of their circle; curves bow away from the row (up or down, 25%) so they leave their own photo, not a neighbour's | `96cb0cf` |
| 10 | 2026-10-27 | Lines curve: each a quadratic arc bowed to one side by a third of its length (always the same way round), re-drawn each frame as the sphere turns | `eaf350c` |
| 9 | 2026-10-27 | **Lines to the models.** 1px lines from each person to two models (Kurosawa → OpenAI, Claude; Deji → Gemini, Perplexity; Stephen → Meta, Hugging Face), each an OKLCH gradient from the person's colour to the model's. They follow their logos round, fade with depth, sit between the far logos and the row, and fade in one by one after the sphere settles | `315dfaf` |
| 8 | 2026-10-27 | Photo rings in the panel background colour `oklch(0.985 0 0)` (not blue/purple/amber), separating the overlaps. The + circle's dashed stroke lighter, `oklch(0.86 0 0)` (was 0.78) | `9427847` |
| 7 | 2026-10-27 | **Explode, closer.** The logos burst out of the centre to the sphere (0.9s, fast-out, 30ms apart), then it turns. Chips 36px (was 28), scaled 0.5× at the back to 1.3× at the front; sphere 1.55× wider than tall (radius 128). Near logos (depth > 0.55) pass in front of the row; far ones fade and blur up to ~1.8px | `2660a4e` |
| 6 | 2026-10-27 | White outline (ring offset) removed: the coloured rings sit right on the photos | `dc045d2` |
| 5 | 2026-10-27 | **Sphere of models.** Row 30% smaller (28, 34, 39, + 45). After it blurs in, 18 AI model logos (OpenAI, Claude, Gemini, Perplexity, Meta, Anthropic, Hugging Face, Ollama, Copilot, X/Grok; Simple Icons, brand colours) in 28px white circles blur in on a Fibonacci sphere (radius 118, tilted 14°) around the row and turn once every 24s; far logos shrink to 60% and fade to 25%; the row stays in front. Reduced motion: still | `c1755e1` |
| 4 | 2026-10-27 | Blur in: each circle starts at a 6px blur and sharpens as it fades and scales in (420ms, 120ms apart) | `9b7ba8d` |
| 3 | 2026-10-27 | **Growing row.** Back to the overlapping row (thought-bubble version kept in its commit), but each one a step bigger than the one before, like a thought bubble's trail: Kurosawa 40, Deji 48, Stephen 56, the dashed + 64; centred on one line | `a5c63eb` |
| 2 | 2026-10-27 | **Thought bubbles.** "Build a group research tool" in the middle as the shared thought; Kurosawa, Deji, Stephen and the dashed + float around it as 56px bubbles in their ring colours, each with a trail of two circles (10px, 6px) shrinking in towards the project, outlined in its colour (dashed grey for the invite). Pop in (project, then trails and bubbles), then bob 3px on staggered rhythms | `6660f22` |
| 1 | 2026-10-27 | **The team and an invite** (`think-together.tsx`). Centred row of the three researchers from slide 2, 48px photos overlapping, each in its ring colour (Kurosawa blue, Deji purple, Stephen amber) with a white gap; then a 48px "+" in a dashed grey circle. They pop in 120ms apart (fade + slight scale) | `eb32a18` |

## The canvas awaits illustration

| # | Date | Version | Commit |
|---|---|---|---|
| 2 | 2026-10-27 | **The whole panel is the canvas.** No dot grid, no square: the nodes (32px, our 20px squircle cards, the project selected in blue) and edges sit on the panel, the composer (320 wide) at the foot. Each node drops in (10px, blur) and fires the auth page's pulse (VapourHalo) as it comes to rest | `27f0b7e` |
| 1 | 2026-10-27 | **A window onto the canvas** (`canvas-awaits.tsx`). A 260px white square (20px squircle, node shadow) with the dot grid; "Build a group research tool" as a selected node (blue ring), blue edges drawn down to User interviews and Core features, and the chat composer ("Ask anything…", blue send) at the foot. Blurs in, nodes pop, edges draw, composer slides up | `c3b4b1e` |

## Dialog and layout

| # | Date | Change | Commit |
|---|---|---|---|
| 28 | 2026-10-27 | Logo to title lockup 16px → 24px (3× the 8px title–body gap); same on Make it yours | `ae36bb1` |
| 27 | 2026-10-27 | Panel shadow reverted: back to the flat `oklch(0.985 0 0)` panel, no ring or shadow | `5de3ba3` |
| 26 | 2026-10-27 | Illustration panel gets the modal's edge: 1px shadow ring at 8%, then the same layered depth (0 1px 2px 4%, 0 4px 12px 4%, 0 16px 40px 6%) | `b5ebaae` |
| 25 | 2026-10-27 | Modal edge per interfaces.dev: the 1px ring stays a shadow at 8% (no border), and the single 0 4px 16px shadow becomes layered depth: 0 1px 2px 4%, 0 4px 12px 4%, 0 16px 40px 6% | `22042d6` |
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
