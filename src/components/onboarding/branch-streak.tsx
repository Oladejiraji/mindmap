/*
 * "Research with the team": five coloured lines, one per teammate, run in
 * from the left and converge on a 32px square, which (with the blue line
 * out of it) is barely there until they arrive. Their strike makes the
 * impact: a blue edge runs from the point of contact round the square to
 * its right side, and one blue line draws out of it. We then follow that
 * line: the view pans with its head, and nodes pop up along it, each
 * growing faded branches. The five colours sit around our blue's
 * complement in OKLCH (brand oklch(0.558 0.226 262) → complement hue 82),
 * fanned 25° apart. One 10s loop; reduced motion shows the converged
 * picture. Drawn at the panel's 578 × 318 and scaled to fit; the world is
 * wider than the panel and the camera moves across it.
 */
import "./branch-streak.css";

const W = 578;
const H = 318;
const MID = H / 2;
// The square, centred on the line out
const BOX = { x: 346, size: 32 };
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

// The blue line runs to LINE_END; its faint track carries on past it
const LINE_END = 1340;
const TRACK_END = 1540;

// Nodes along the blue line, each with faded branches (dy: where each
// branch settles above or below the line). Their pop times are in the CSS.
const NODES = [
  { x: 560, branches: [-50, 44] },
  { x: 760, branches: [52] },
  { x: 960, branches: [-44, 50] },
  { x: 1160, branches: [-52] },
];
const NODE = 12;

// From its dot on the left, straight on, then curving into the square's
// left side
const linePath = (y: number) =>
  `M${START_X} ${y} L${BOX.x - 160} ${y} C${BOX.x - 90} ${y} ${BOX.x - 70} ${MID} ${BOX.x} ${MID}`;

// Out of a node, curving off the line, then straight on
const branchPath = (x: number, dy: number) =>
  `M${x} ${MID} C${x + 25} ${MID} ${x + 30} ${MID + dy} ${x + 60} ${MID + dy} L${x + 110} ${MID + dy}`;

export function BranchStreak() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="branch-streak absolute inset-0 size-full" aria-hidden>
      <g className="bs-world">
        <g className="bs-camera">
          {/* Faint tracks for the five lines */}
          {LINES.map((l) => (
            <path key={l.y} d={linePath(l.y)} className="bs-track" fill="none" />
          ))}
          {/* The line out, barely there until the strike */}
          <line x1={BOX_RIGHT} y1={MID} x2={TRACK_END} y2={MID} className="bs-track bs-track-out" />

          {/* The five coloured lines running in together, from their dots */}
          {LINES.map((l) => (
            <g key={l.y} style={{ color: l.color }}>
              <circle cx={START_X} cy={l.y} r="4" fill="currentColor" />
              <path d={linePath(l.y)} pathLength={1} className="bs-run" fill="none" stroke="currentColor" />
            </g>
          ))}

          {/* Faded branches, growing out of each node once it pops */}
          {NODES.map((n, i) =>
            n.branches.map((dy) => (
              <path
                key={`${n.x}${dy}`}
                d={branchPath(n.x, dy)}
                pathLength={1}
                className={`bs-branch bs-at-${i + 1}`}
                fill="none"
              />
            )),
          )}

          {/* The one blue line out of the square */}
          <line x1={BOX_RIGHT} y1={MID} x2={LINE_END} y2={MID} pathLength={1} className="bs-out" />

          {/* Nodes popping up on the line as its head passes */}
          {NODES.map((n, i) => (
            <rect
              key={n.x}
              className={`bs-node bs-at-${i + 1}`}
              x={n.x - NODE / 2}
              y={MID - NODE / 2}
              width={NODE}
              height={NODE}
              rx="3"
            />
          ))}

          {/* The 32px square. Grey until the lines strike its left edge;
              then a blue edge runs from that point round both sides to the
              right, where the blue line leaves */}
          <rect className="bs-box" x={BOX.x} y={TOP} width={BOX.size} height={BOX.size} rx={R} />
          <path className="bs-edge" d={EDGE_TOP} pathLength={1} fill="none" />
          <path className="bs-edge" d={EDGE_BOTTOM} pathLength={1} fill="none" />
        </g>
      </g>
    </svg>
  );
}
