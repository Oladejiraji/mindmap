/*
 * "Research with the team": five coloured lines, one per teammate, run in
 * from the left and converge on a 32px square, which (with everything to
 * its right) is barely there until they arrive. Their strike makes the
 * impact: a blue edge runs from the point of contact round the square to
 * its right side, and one blue line draws out of it into a text box (Apple's
 * iOS text field size), where "What does Mindmap do?" types in; the box pulses
 * blue twice, then fills blue with the text in white. The five colours sit around our blue's
 * complement in OKLCH (brand oklch(0.558 0.226 262) → complement hue 82),
 * fanned 25° apart. One 6s loop; reduced motion shows the finished
 * picture. Drawn at the panel's 578 × 318 and scaled to fit.
 * (The earlier "follow the line" version, with nodes and faded branches,
 * is in 26737dc.)
 */
import "./branch-streak.css";

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

// The text box the blue line runs into, at Apple's iOS text field size:
// 36pt tall, 10pt corners, a grey fill and no border, with the blue caret.
// Its right margin matches the dots' 48 on the left.
const TEXT = { x: 350, w: 180, h: 36, r: 10, pad: 12 };

// What gets typed, and where each character ends (Inter 13px, measured
// with getSubStringLength) so the caret lands right after it. Characters
// appear one at a time from TYPE_FROM to TYPE_TO (% of the loop).
const PHRASE = "What does Mindmap do?";
const ENDS = [
  12.8, 20.4, 27.6, 31.8, 35.4, 43.3, 51, 58.6, 65.4, 69, 80.7, 83.7, 91.4, 99.3, 110.6, 117.8, 125.7, 129.3, 137.2,
  145, 151.5,
];
const TYPE_FROM = 33;
const TYPE_TO = 55;
const typedAt = (i: number) => +(TYPE_FROM + ((TYPE_TO - TYPE_FROM) * i) / (PHRASE.length - 1)).toFixed(2);

// One keyframe per character (it appears at its moment), and the caret's
// steps, generated so each lands exactly when its character does
const typingCss = [
  ...[...PHRASE].map(
    (_, i) =>
      `@keyframes bs-ch-${i}{0%,${typedAt(i)}%{opacity:0}${typedAt(i) + 0.01}%,100%{opacity:1}}.branch-streak .bs-ch-${i}{animation:bs-ch-${i} var(--bs-dur) infinite}`,
  ),
  `@keyframes bs-caret-run{0%,${TYPE_FROM - 0.01}%{transform:translateX(0)}${[...PHRASE]
    .map((_, i) => `${typedAt(i)}%{transform:translateX(${ENDS[i] + 1}px)}`)
    .join("")}100%{transform:translateX(${ENDS[ENDS.length - 1] + 1}px)}}`,
  `.branch-streak .bs-caret-run{animation:bs-caret-run var(--bs-dur) steps(1,end) infinite}`,
  `@media (prefers-reduced-motion:reduce){.branch-streak [class*="bs-ch-"],.branch-streak .bs-caret-run{animation:none}.branch-streak .bs-caret-run{transform:translateX(${ENDS[ENDS.length - 1] + 1}px)}}`,
].join("");

// From its dot on the left, straight on, then curving into the square's
// left side
const linePath = (y: number) =>
  `M${START_X} ${y} L${BOX.x - 150} ${y} C${BOX.x - 85} ${y} ${BOX.x - 65} ${MID} ${BOX.x} ${MID}`;

export function BranchStreak() {
  const textTop = MID - TEXT.h / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="branch-streak absolute inset-0 size-full" aria-hidden>
      <g className="bs-world">
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
            time with the caret just after it; the box then pulses a blue
            stroke twice and fills blue, the text turning white */}
        <style>{typingCss}</style>
        <rect className="bs-text" x={TEXT.x} y={textTop} width={TEXT.w} height={TEXT.h} rx={TEXT.r} />
        <rect className="bs-text-ring" x={TEXT.x} y={textTop} width={TEXT.w} height={TEXT.h} rx={TEXT.r} />
        <text className="bs-typed" x={TEXT.x + TEXT.pad} y={MID} dominantBaseline="central" fontSize="13">
          {[...PHRASE].map((c, i) => (
            <tspan key={i} className={`bs-ch-${i}`}>
              {c}
            </tspan>
          ))}
        </text>
        <g className="bs-caret-run">
          <rect className="bs-caret" x={TEXT.x + TEXT.pad} y={MID - 9} width="2" height="18" rx="1" />
        </g>

        {/* The 32px square. Grey until the lines strike its left edge;
            then a blue edge runs from that point round both sides to the
            right, where the blue line leaves */}
        <rect className="bs-box" x={BOX.x} y={TOP} width={BOX.size} height={BOX.size} rx={R} />
        <path className="bs-edge" d={EDGE_TOP} pathLength={1} fill="none" />
        <path className="bs-edge" d={EDGE_BOTTOM} pathLength={1} fill="none" />
      </g>
    </svg>
  );
}
