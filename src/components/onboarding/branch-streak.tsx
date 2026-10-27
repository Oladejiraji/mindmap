"use client";

/*
 * "Research with the team": five coloured lines, one per teammate, run in
 * from the left and converge on a 32px square, which (with everything to
 * its right) is faint and colourless until they arrive. Each step is a
 * process: their strike starts a blue edge travelling from the point of
 * contact round the square, lighting it as it goes; a blue line then draws
 * out of it into a text box (Apple's iOS text field size), where "What does
 * Mindmap do?" types in; a blue stroke runs once round the box from its
 * left side, then blue flows into it from the left with the text in white.
 * The five colours sit around our blue's complement in OKLCH (brand
 * oklch(0.558 0.226 262) → complement hue 82), fanned 25° apart. The auth
 * page's pulse (VapourHalo) fires on the square once lit and on the text
 * box once filled. One 7s loop; reduced motion shows the finished
 * picture. Drawn at the panel's 578 × 318 and scaled to fit.
 * (The earlier "follow the line" version, with nodes and faded branches,
 * is in 26737dc.)
 */
import { useEffect, useRef, useState } from "react";
import { VapourHalo } from "@/components/auth-canvas/vapour-halo";

const W = 578;
const H = 318;
const MID = H / 2;
// The square
const BOX = { x: 236, size: 32 };
const BOX_RIGHT = BOX.x + BOX.size;
const TOP = MID - BOX.size / 2;
const R = 8;
// The square's outline in two halves, both starting where the lines strike
// (left middle) and ending where the blue line leaves (right middle)
const EDGE_TOP = `M${BOX.x} ${MID} V${TOP + R} A${R} ${R} 0 0 1 ${BOX.x + R} ${TOP} H${BOX_RIGHT - R} A${R} ${R} 0 0 1 ${BOX_RIGHT} ${TOP + R} V${MID}`;
const EDGE_BOTTOM = `M${BOX.x} ${MID} V${TOP + BOX.size - R} A${R} ${R} 0 0 0 ${BOX.x + R} ${TOP + BOX.size} H${BOX_RIGHT - R} A${R} ${R} 0 0 0 ${BOX_RIGHT} ${TOP + BOX.size - R} V${MID}`;

const LINES = [
  { y: MID - 112, color: "oklch(0.7 0.18 32)" }, // coral
  { y: MID - 56, color: "oklch(0.74 0.17 57)" }, // orange
  { y: MID, color: "oklch(0.8 0.16 82)" }, // amber, the complement
  { y: MID + 56, color: "oklch(0.78 0.17 107)" }, // chartreuse
  { y: MID + 112, color: "oklch(0.72 0.17 132)" }, // green
];
const START_X = 48;

// The text box the blue line runs into, after Apple's iOS text field
// (32px tall here, 10pt corners), a grey fill and no border, with the blue caret.
// Its right margin matches the dots' 48 on the left.
const TEXT = { x: 350, w: 180, h: 32, r: 10, pad: 12 };
const TT = MID - TEXT.h / 2;
const TR = TEXT.r;
// The box's outline as one stroke from its left middle (where the blue
// line arrives), clockwise all the way round and back
const TEXT_RING = `M${TEXT.x} ${MID} V${TT + TR} A${TR} ${TR} 0 0 1 ${TEXT.x + TR} ${TT} H${TEXT.x + TEXT.w - TR} A${TR} ${TR} 0 0 1 ${TEXT.x + TEXT.w} ${TT + TR} V${TT + TEXT.h - TR} A${TR} ${TR} 0 0 1 ${TEXT.x + TEXT.w - TR} ${TT + TEXT.h} H${TEXT.x + TR} A${TR} ${TR} 0 0 1 ${TEXT.x} ${TT + TEXT.h - TR} V${MID}`;

// What gets typed, and where each character ends (Inter 13px, measured
// with getSubStringLength) so the caret lands right after it. Characters
// appear one at a time from TYPE_FROM to TYPE_TO (% of the loop).
const PHRASE = "What does Mindmap do?";
const ENDS = [
  12.8, 20.4, 27.6, 31.8, 35.4, 43.3, 51, 58.6, 65.4, 69, 80.7, 83.7, 91.4, 99.3, 110.6, 117.8, 125.7, 129.3, 137.2,
  145, 151.5,
];
const TYPE_FROM = 32.86;
const TYPE_TO = 51.43;
const typedAt = (i: number) => +(TYPE_FROM + ((TYPE_TO - TYPE_FROM) * i) / (PHRASE.length - 1)).toFixed(2);

// One keyframe per character (it appears at its moment), and the caret's
// steps, generated so each lands exactly when its character does (keyframe
// offsets can't take CSS vars). Single-class selectors, so the leaving and
// reduced-motion rules in animations.css override them.
const CARET_END = `translateX(${ENDS[ENDS.length - 1] + 1}px)`;
const typingCss = [
  ...[...PHRASE].map(
    (_, i) =>
      `@keyframes bs-ch-${i}{0%,${typedAt(i)}%{opacity:0}${typedAt(i) + 0.01}%,100%{opacity:1}}.bs-ch-${i}{animation:bs-ch-${i} var(--bs-dur) infinite}`,
  ),
  `@keyframes bs-caret-run{0%,${TYPE_FROM - 0.01}%{transform:translateX(0)}${[...PHRASE]
    .map((_, i) => `${typedAt(i)}%{transform:translateX(${ENDS[i] + 1}px)}`)
    .join("")}100%{transform:${CARET_END}}}`,
  `.bs-caret-run{animation:bs-caret-run var(--bs-dur) steps(1,end) infinite}`,
].join("");

// The auth page's pulse (VapourHalo: pastel washes, the dot pattern the
// wave reveals, a chromatic fringe) fires on the square once it's lit and
// on the text box once the blue has filled it (seconds into the loop)
const HALOS = [
  { at: 1.64, x: BOX.x, y: TOP, width: BOX.size, height: BOX.size, lightResidue: false },
  { at: 5.25, x: TEXT.x, y: TT, width: TEXT.w, height: TEXT.h, lightResidue: true },
];

// From its dot on the left, straight on, then curving into the square's
// left side
const linePath = (y: number) =>
  `M${START_X} ${y} L${BOX.x - 150} ${y} C${BOX.x - 85} ${y} ${BOX.x - 65} ${MID} ${BOX.x} ${MID}`;

export function BranchStreak({ leaving = false }: { leaving?: boolean }) {
  const textTop = TT;
  const worldRef = useRef<SVGGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [halos, setHalos] = useState<{ id: number; i: number }[]>([]);

  // Fire the halos at their moments in each loop, timed from the loop's
  // own start and repeat events so they stay in step with the CSS
  useEffect(() => {
    const world = worldRef.current;
    if (!world || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    const onLoop = (e: AnimationEvent) => {
      if (e.target !== world || e.animationName !== "bs-world") return;
      timers.forEach(clearTimeout);
      // A new loop: clear any halo still lingering from the last one
      setHalos([]);
      timers = HALOS.map((h, i) =>
        window.setTimeout(() => setHalos((prev) => [...prev.filter((p) => p.i !== i), { id: Date.now(), i }]), h.at * 1000),
      );
    };
    world.addEventListener("animationstart", onLoop);
    world.addEventListener("animationiteration", onLoop);
    return () => {
      world.removeEventListener("animationstart", onLoop);
      world.removeEventListener("animationiteration", onLoop);
      timers.forEach(clearTimeout);
    };
  }, []);

  // Keep the halo layer drawn at the SVG's scale and position (the SVG
  // fits the panel, preserving its 578 × 318 aspect)
  useEffect(() => {
    const stage = stageRef.current;
    const panel = stage?.parentElement;
    if (!stage || !panel) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      stage.style.scale = String(Math.min(width / W, height / H));
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {/* The halos, behind the drawing, on a 578 × 318 layer scaled with it;
          it fades out with the drawing at the end of each loop */}
      <div
        ref={stageRef}
        className="bs-halos pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: W, height: H }}
        aria-hidden
      >
        {halos.map((h) => (
          // The text box's halo leaves a lighter residue (animations.css)
          <div key={h.id} className={HALOS[h.i].lightResidue ? "bs-halo-light" : undefined}>
            <VapourHalo
              {...HALOS[h.i]}
              onDone={() => setHalos((prev) => prev.filter((p) => p.id !== h.id))}
            />
          </div>
        ))}
      </div>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`branch-streak absolute inset-0 size-full${leaving ? " bs-leaving" : ""}`}
      aria-hidden
    >
      <g className="bs-world" ref={worldRef}>
        {/* Faint tracks for the five lines */}
        {LINES.map((l) => (
          <path key={l.y} d={linePath(l.y)} className="bs-track" fill="none" />
        ))}
        {/* The way to the text box, barely there until the strike */}
        <line x1={BOX_RIGHT} y1={MID} x2={TEXT.x} y2={MID} className="bs-track bs-track-out" />

        {/* The five coloured lines running in together, from their dots */}
        {LINES.map((l) => (
          <g key={l.y} style={{ color: l.color }}>
            <circle cx={START_X} cy={l.y} r="4" fill="currentColor" />
            <path d={linePath(l.y)} pathLength={1} className="bs-run" fill="none" stroke="currentColor" />
          </g>
        ))}

        {/* The blue line from the square into the text box */}
        <line x1={BOX_RIGHT} y1={MID} x2={TEXT.x} y2={MID} pathLength={1} className="bs-out" />

        {/* The text box: "What does Mindmap do?" types in a character at a
            time with the caret just after it; then a blue stroke runs once
            round it from the left, and blue flows in from the left, the
            text in white */}
        <style>{typingCss}</style>
        <rect className="bs-text" x={TEXT.x} y={textTop} width={TEXT.w} height={TEXT.h} rx={TEXT.r} />
        <text className="bs-typed" x={TEXT.x + TEXT.pad} y={MID} dominantBaseline="central" fontSize="13">
          {[...PHRASE].map((c, i) => (
            <tspan key={i} className={`bs-ch-${i}`}>
              {c}
            </tspan>
          ))}
        </text>
        <g className="bs-caret-run" style={{ transform: CARET_END }}>
          <rect className="bs-caret" x={TEXT.x + TEXT.pad} y={MID - 9} width="2" height="18" rx="1" />
        </g>
        <path className="bs-text-ring" d={TEXT_RING} pathLength={1} fill="none" />
        {/* Sent: the same box in blue with the question in white, revealed
            from the left over the grey one; its shadow sits outside the
            reveal so it grows in with the blue */}
        {/* On Continue: the line runs on out of the text box, off the
            panel's right edge, into the next slide */}
        <line x1={TEXT.x + TEXT.w} y1={MID} x2={W + 2} y2={MID} pathLength={1} className="bs-exit" />
        <g className="bs-sent-shadow">
          <g className="bs-sent">
            <rect x={TEXT.x} y={textTop} width={TEXT.w} height={TEXT.h} rx={TEXT.r} />
            <text x={TEXT.x + TEXT.pad} y={MID} dominantBaseline="central" fontSize="13">
              {PHRASE}
            </text>
          </g>
        </g>

        {/* The 32px square. Faint and colourless until the lines strike
            its left edge; then a blue edge travels from that point round
            both sides to the right, and the square lights up behind it */}
        {/* The edge's gradient, like the pulse: the colours that struck
            on the left turning into our blue on the right, where the blue
            line leaves */}
        <defs>
          <linearGradient id="bs-edge-grad" gradientUnits="userSpaceOnUse" x1={BOX.x} y1={MID} x2={BOX_RIGHT} y2={MID}>
            <stop offset="0" stopColor="oklch(0.7 0.18 32)" />
            <stop offset="0.3" stopColor="oklch(0.8 0.16 82)" />
            <stop offset="0.55" stopColor="oklch(0.72 0.17 132)" />
            <stop offset="1" stopColor="var(--brand-solid)" />
          </linearGradient>
        </defs>
        <rect className="bs-box" x={BOX.x} y={TOP} width={BOX.size} height={BOX.size} rx={R} />
        <rect className="bs-box-lit" x={BOX.x} y={TOP} width={BOX.size} height={BOX.size} rx={R} />
        <path className="bs-edge" d={EDGE_TOP} pathLength={1} fill="none" />
        <path className="bs-edge" d={EDGE_BOTTOM} pathLength={1} fill="none" />
      </g>
    </svg>
    </>
  );
}
