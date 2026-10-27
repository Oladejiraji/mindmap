/*
 * "Research with the team": a blue streak runs along a faint track until it
 * hits a 32px square, which pulses, then five lines branch off it to the
 * right, each ending in a dot. The branch colours sit around our blue's
 * complement in OKLCH (brand oklch(0.558 0.226 262) → complement hue 82),
 * fanned 25° apart. One 4.8s loop; reduced motion shows the finished
 * picture. Drawn at the panel's 578 × 318 and scaled to fit.
 */
import "./branch-streak.css";

const W = 578;
const H = 318;
const MID = H / 2;
// The square, centred on the track
const BOX = { x: 200, size: 32 };
const BOX_RIGHT = BOX.x + BOX.size;

const BRANCHES = [
  { y: MID - 112, color: "oklch(0.7 0.18 32)" }, // coral
  { y: MID - 56, color: "oklch(0.74 0.17 57)" }, // orange
  { y: MID, color: "oklch(0.8 0.16 82)" }, // amber, the complement
  { y: MID + 56, color: "oklch(0.78 0.17 107)" }, // chartreuse
  { y: MID + 112, color: "oklch(0.72 0.17 132)" }, // green
];
const END_X = W - 48;

// Out of the square's right side, curving to its row, then straight on
const branchPath = (y: number) =>
  `M${BOX_RIGHT} ${MID} C${BOX_RIGHT + 70} ${MID} ${BOX_RIGHT + 90} ${y} ${BOX_RIGHT + 160} ${y} L${END_X} ${y}`;

export function BranchStreak() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="branch-streak absolute inset-0 size-full" aria-hidden>
      <defs>
        {/* The streak: a fading tail into a bright blue head */}
        <linearGradient id="bs-streak" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--brand-solid)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--brand-solid)" />
        </linearGradient>
        {/* The streak disappears into the square */}
        <clipPath id="bs-trunk">
          <rect x="0" y={MID - 10} width={BOX.x} height="20" />
        </clipPath>
      </defs>

      {/* Faint tracks: the trunk and the five branches */}
      <line x1="0" y1={MID} x2={BOX.x} y2={MID} className="bs-track" />
      {BRANCHES.map((b) => (
        <path key={b.y} d={branchPath(b.y)} className="bs-track" fill="none" />
      ))}

      {/* The blue streak */}
      <g clipPath="url(#bs-trunk)">
        <rect className="bs-streak" x={-96} y={MID - 1.5} width="96" height="3" rx="1.5" fill="url(#bs-streak)" />
      </g>

      {/* The branches drawing out, staggered, each ending in a dot */}
      {BRANCHES.map((b, i) => (
        <g key={b.y} style={{ ["--i" as string]: i, color: b.color }}>
          <path d={branchPath(b.y)} pathLength={1} className="bs-branch" fill="none" stroke="currentColor" />
          <circle cx={END_X} cy={b.y} r="4" className="bs-dot" fill="currentColor" />
        </g>
      ))}

      {/* The 32px square */}
      <rect className="bs-box" x={BOX.x} y={MID - BOX.size / 2} width={BOX.size} height={BOX.size} rx="8" />
    </svg>
  );
}
