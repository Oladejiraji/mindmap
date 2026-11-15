import React from "react";
import { motion } from "motion/react";
import { C, draw } from "./shared";

/**
 * The drafting layer every scene shares, so each reads as a technical drawing:
 * the sheet (grid and crop marks), guide lines that draw before the solids
 * land, numbered callouts and dimensions.
 */

type Pt = [number, number];

const mono = "font-mono uppercase";

/** Grid and crop marks. Lives in the slot, behind the scenes, so it holds still while they crossfade. */
export function Sheet() {
  const grid = [
    ...Array.from({ length: 19 }, (_, i) => `M${12 + i * 12} 0V286`),
    ...Array.from({ length: 23 }, (_, i) => `M0 ${11 + i * 12}H240`),
  ].join("");
  const I = 10, L = 6;
  const marks = [
    `M${I} ${I + L}V${I}H${I + L}`,
    `M${240 - I - L} ${I}H${240 - I}V${I + L}`,
    `M${I} ${286 - I - L}V${286 - I}H${I + L}`,
    `M${240 - I - L} ${286 - I}H${240 - I}V${286 - I - L}`,
  ].join("");
  return (
    <g fill="none" strokeWidth={1}>
      <path d={grid} stroke={C.line} strokeWidth={0.5} opacity={0.45} />
      <path d={marks} stroke={C.muted} />
    </g>
  );
}

/** A thin construction line. Paint it before the solids, so they cover it. */
export function Guide({ from, to, delay = 0.1 }: { from: Pt; to: Pt; delay?: number }) {
  return <motion.path d={`M${from.join(" ")}L${to.join(" ")}`} stroke={C.line} fill="none" {...draw(delay, 0.7)} />;
}

type Side = "below" | "above" | "right" | "left";

/** Where a callout's label sits, beside its balloon at (x, y). */
const LABEL_AT: Record<Side, (x: number, y: number) => { x: number; y: number; textAnchor: "middle" | "start" | "end" }> = {
  below: (x, y) => ({ x, y: y + 14, textAnchor: "middle" }),
  above: (x, y) => ({ x, y: y - 10, textAnchor: "middle" }),
  right: (x, y) => ({ x: x + 10, y: y + 2, textAnchor: "start" }),
  left: (x, y) => ({ x: x - 10, y: y + 2, textAnchor: "end" }),
};

/** A numbered balloon at `to`, its leader running to a dot on `at`. */
export function Callout(props: {
  n: string;
  label: string;
  at: Pt;
  to: Pt;
  side?: Side;
  delay: number;
}) {
  const { n, label, at, to, side = "below", delay } = props;
  const [ax, ay] = at, [cx, cy] = to;
  const len = Math.hypot(cx - ax, cy - ay) || 1;
  const ex = cx - ((cx - ax) / len) * 6, ey = cy - ((cy - ay) / len) * 6;
  return (
    <g>
      <motion.path d={`M${ax} ${ay}L${ex} ${ey}`} stroke={C.muted} fill="none" {...draw(delay, 0.4)} />
      <motion.circle
        cx={ax}
        cy={ay}
        r={1.4}
        fill={C.ink}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1, delay }}
      />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: delay + 0.3 }}>
        <circle cx={cx} cy={cy} r={6} fill={C.plate} stroke={C.ink} />
        <text x={cx} y={cy + 0.3} fontSize={6} fill={C.ink} textAnchor="middle" dominantBaseline="central" className="font-mono">
          {n}
        </text>
        <text {...LABEL_AT[side](cx, cy)} fontSize={5} fill={C.muted} className={`${mono} tracking-[0.1em]`}>
          {label}
        </text>
      </motion.g>
    </g>
  );
}

/**
 * A dimension between a and b, pushed out by `offset`: extension lines, the
 * dimension line with slash ticks, and its label set along it.
 */
export function Dimension(props: { a: Pt; b: Pt; offset: Pt; label: string; delay: number }) {
  const { a, b, offset, label, delay } = props;
  const len = Math.hypot(...offset);
  const u: Pt = [offset[0] / len, offset[1] / len];
  const A: Pt = [a[0] + offset[0], a[1] + offset[1]];
  const B: Pt = [b[0] + offset[0], b[1] + offset[1]];
  const ext = (p: Pt) => `M${p[0] + u[0] * 3} ${p[1] + u[1] * 3}L${p[0] + offset[0] + u[0] * 4} ${p[1] + offset[1] + u[1] * 4}`;
  const tick = ([x, y]: Pt) => `M${x - 2.5} ${y + 2.5}l5 -5`;

  // Keep the label upright, and on the far side of the line from the part.
  let angle = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  // Vertical reads bottom to top.
  if (angle > 89.99) angle = -90;
  const rad = (angle * Math.PI) / 180;
  const towardLine = Math.sin(rad) * u[0] - Math.cos(rad) * u[1] < 0;
  const gap = towardLine ? 7 : 3;
  const mx = (A[0] + B[0]) / 2 + u[0] * gap, my = (A[1] + B[1]) / 2 + u[1] * gap;

  return (
    <g>
      <motion.path d={ext(a)} stroke={C.line} fill="none" {...draw(delay, 0.3)} />
      <motion.path d={ext(b)} stroke={C.line} fill="none" {...draw(delay, 0.3)} />
      <motion.path d={`M${A.join(" ")}L${B.join(" ")}`} stroke={C.muted} fill="none" {...draw(delay + 0.15, 0.5)} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: delay + 0.5 }}>
        <path d={tick(A) + tick(B)} stroke={C.ink} fill="none" />
        <text
          transform={`translate(${mx} ${my}) rotate(${angle})`}
          fontSize={5}
          fill={C.muted}
          textAnchor="middle"
          className={`${mono} tracking-[0.1em]`}
        >
          {label}
        </text>
      </motion.g>
    </g>
  );
}
