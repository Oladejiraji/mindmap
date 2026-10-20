"use client";

import type { CSSProperties } from "react";

/*
 * Drop effect: a soft pastel glow on the dropped card (Apple's chip
 * renders: lavender and sky on top, peach and butter below, the colours
 * slowly turning), then waves of the same colours ripple outward. Each
 * wave travels further than the last but starts weaker, and fades,
 * blurs and thins as it goes, so the ripple loses steam. Sits in flow
 * coordinates behind the nodes; the animation lives in globals.css.
 */

// reach: how far past the card the wave travels (px); peak: its opacity
// as it leaves the card; band: its thickness; blur: softer the further
// out it goes.
const WAVES = [
  { reach: 64, peak: 0.95, band: 18, blur: 10, delay: 0.05 },
  { reach: 112, peak: 0.6, band: 14, blur: 16, delay: 0.3 },
  { reach: 160, peak: 0.32, band: 10, blur: 22, delay: 0.55 },
];

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
  return (
    <div className="vapour-halo" style={{ left: x, top: y, width, height }} aria-hidden>
      <div className="vapour-halo-glow vapour-halo-colour" />
      {WAVES.map((w, i) => (
        <div
          key={i}
          className="vapour-wave"
          style={
            {
              "--wave-reach": `${w.reach}px`,
              filter: `blur(${w.blur}px)`,
              animationDelay: `${w.delay}s`,
            } as CSSProperties
          }
          onAnimationEnd={i === WAVES.length - 1 ? () => onDone() : undefined}
        >
          <div className="vapour-wave-band vapour-halo-colour" style={{ padding: w.band, opacity: w.peak }} />
        </div>
      ))}
    </div>
  );
}
