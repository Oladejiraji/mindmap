"use client";

import { useId, type CSSProperties } from "react";
import "./vapour-halo.css";

/*
 * Drop effect, after Apple's chip renders: the card splits into
 * chromatic fringes (sky on one edge, rose and butter on the others), and
 * clouds of pastel colour wash outward from it. The clouds are filled,
 * uneven and warped by turbulence, not outlines. Each wash spreads
 * further than the last but starts weaker and blurrier, so the wave loses
 * steam. As the wave front passes it reveals a dot grid, which fades
 * behind it. The fringe settles into a faint coloured residue on the card's
 * edges that fades last. Sits in flow coordinates behind the nodes; the
 * animation lives in vapour-halo.css.
 */

// reach: how far past the card the wash spreads (px); peak: its opacity
// as it leaves the card; blur: softer the further out it goes; turn:
// rotates the colour map so each wash is tinted differently.
const WAVES = [
  { reach: 35, peak: 0.42, blur: 14, turn: 0, delay: 0.04 },
  { reach: 65, peak: 0.25, blur: 20, turn: 40, delay: 0.26 },
  { reach: 95, peak: 0.14, blur: 26, turn: -35, delay: 0.5 },
];

// The dot grid the wave reveals: spacing (px) and how far past the card it
// reaches (a little beyond the furthest wash).
const DOT_GAP = 14;
const DOT_REACH = 110;
const mod = (n: number, m: number) => ((n % m) + m) % m;

export function VapourHalo({
  x,
  y,
  width,
  height,
  onDone,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  onDone: () => void;
}) {
  const filterId = `vapour-warp-${useId().replace(/:/g, "")}`;
  return (
    <div className="vapour-halo" style={{ left: x, top: y, width, height }} aria-hidden>
      {/* Turbulence that warps the washes' edges; it drifts while they spread */}
      <svg width="0" height="0" className="absolute">
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7">
            <animate attributeName="baseFrequency" dur="2.4s" values="0.006 0.009;0.009 0.006" fill="freeze" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="70" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {WAVES.map((w, i) => (
        <div
          key={i}
          className="vapour-wave"
          style={
            {
              "--wave-reach": `${w.reach}px`,
              filter: `url(#${filterId}) blur(${w.blur}px)`,
              animationDelay: `${w.delay}s`,
            } as CSSProperties
          }
        >
          <div className="vapour-wash" style={{ opacity: w.peak, rotate: `${w.turn}deg` }} />
        </div>
      ))}
      {/* Dots sit on one canvas-wide grid, so every drop reveals the same
          points: offset the pattern by where this layer starts. */}
      <div
        className="vapour-dots"
        style={{
          inset: -DOT_REACH,
          backgroundSize: `${DOT_GAP}px ${DOT_GAP}px`,
          backgroundPosition: `${-mod(x - DOT_REACH, DOT_GAP)}px ${-mod(y - DOT_REACH, DOT_GAP)}px`,
        }}
      />
      <div className="vapour-fringe" onAnimationEnd={onDone} />
    </div>
  );
}
