/*
 * "Research with the team": five coloured lines, one per teammate, run in
 * from the left and converge on a 32px square, which (with everything to
 * its right) is barely there until they arrive. Their strike makes the
 * impact: a blue edge runs from the point of contact round the square to
 * its right side, and one blue line draws out of it into a text box (Apple's
 * iOS text field size), where a line of text writes in behind the caret. The five colours sit around our blue's
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
// 36pt tall, 10pt corners, a grey fill and no border, one line of text
// with the blue caret. Its right margin matches the dots' 48 on the left.
const TEXT = { x: 356, w: 174, h: 36, r: 10, pad: 12 };
const TEXT_W = 104;
const TEXT_LINE_H = 7;

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

        {/* The text box: its text writes in with the caret riding ahead
            of it, then the caret blinks */}
        <rect className="bs-text" x={TEXT.x} y={textTop} width={TEXT.w} height={TEXT.h} rx={TEXT.r} />
        <rect
          className="bs-text-line"
          x={TEXT.x + TEXT.pad}
          y={MID - TEXT_LINE_H / 2}
          width={TEXT_W}
          height={TEXT_LINE_H}
          rx={TEXT_LINE_H / 2}
        />
        <g className="bs-caret-run" style={{ ["--bs-text-w" as string]: `${TEXT_W + 3}px` }}>
          <rect className="bs-caret" x={TEXT.x + TEXT.pad} y={MID - 10} width="2" height="20" rx="1" />
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
