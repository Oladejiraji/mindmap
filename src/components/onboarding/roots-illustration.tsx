"use client";

import { useMemo } from "react";
import "./roots-illustration.css";

/*
 * "Ask then Branch": a greyscale tree seen from below, after a photo of
 * exposed roots. The trunk (the question) drops in from the top and splits
 * into roots (the answers and their branches) that thin and fade as they
 * spread. Pulses of light run through every root, trunk outward, like the
 * question feeding each branch. Generated from a fixed seed, so it looks
 * the same on every render (and on the server). Reduced motion keeps the
 * tree and drops the pulses.
 */

const W = 770;
const H = 318;

type Segment = { d: string; width: number; depth: number; delay: number };

// Small seeded PRNG (mulberry32) so the tree is stable between renders
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function growTree(): Segment[] {
  const rand = rng(11);
  const out: Segment[] = [];
  const MAX_DEPTH = 7;
  const BASE = 118; // where the trunk splits into roots

  const grow = (x: number, y: number, angle: number, len: number, width: number, depth: number, delay: number) => {
    const rad = (angle * Math.PI) / 180;
    const x2 = x + Math.cos(rad) * len;
    const y2 = y + Math.sin(rad) * len;
    // A gentle bend, so roots look organic rather than straight
    const bend = (rand() - 0.5) * len * 0.45;
    const cx = (x + x2) / 2 - Math.sin(rad) * bend;
    const cy = (y + y2) / 2 + Math.cos(rad) * bend;
    out.push({ d: `M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`, width, depth, delay });
    if (depth >= MAX_DEPTH || width < 0.5 || y2 > H + 30 || x2 < -60 || x2 > W + 60) return;
    const kids = depth < 3 ? 3 : 2 + (rand() < 0.5 ? 1 : 0);
    const fan = depth < 3 ? 70 : 55;
    for (let i = 0; i < kids; i++) {
      const spread = (i / (kids - 1) - 0.5) * fan + (rand() - 0.5) * 24;
      const next = Math.max(4, Math.min(176, angle + spread));
      grow(x2, y2, next, len * (0.6 + rand() * 0.18), width * (0.52 + rand() * 0.12), depth + 1, delay + 0.3 + rand() * 0.25);
    }
  };

  // Trunk: thick, straight down from above the panel
  out.push({ d: `M${W / 2},-12 L${W / 2},${BASE}`, width: 30, depth: 0, delay: 0 });
  // Main roots fan out from the trunk's base, from almost flat on each side
  // to straight down
  const mains = [8, 28, 52, 76, 104, 128, 152, 172];
  mains.forEach((angle, i) => {
    const jitter = (rand() - 0.5) * 10;
    const len = 120 + rand() * 70 + Math.abs(90 - angle) * 0.6;
    grow(W / 2 + (i - (mains.length - 1) / 2) * 3, BASE - 4, angle + jitter, len, 9 + rand() * 6, 1, 0.3 + rand() * 0.2);
  });
  return out;
}

// Light grey for the trunk and thick roots, fading to dim grey at the tips
// (solid colours, not opacity, so overlapping joins don't brighten)
const tone = (depth: number) => {
  const l = Math.round(226 - depth * 24);
  return `rgb(${l},${l},${l})`;
};

export function RootsIllustration() {
  const segments = useMemo(() => growTree(), []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="roots-glow" cx="50%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#050505" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#roots-glow)" />
      <g fill="none" strokeLinecap="round">
        {segments.map((s, i) => (
          <path key={i} d={s.d} stroke={tone(s.depth)} strokeWidth={s.width} />
        ))}
      </g>
      {/* Data flowing through: a short bright dash running each root */}
      <g fill="none" strokeLinecap="round" className="roots-flow">
        {segments.map((s, i) => (
          <path
            key={i}
            d={s.d}
            pathLength={100}
            stroke="#fff"
            strokeWidth={Math.max(1, s.width * 0.45)}
            style={{ animationDelay: `${s.delay.toFixed(2)}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
