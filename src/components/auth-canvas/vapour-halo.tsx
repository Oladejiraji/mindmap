"use client";

import type { CSSProperties } from "react";

/*
 * Drop effect: a soft pastel halo that blooms out from behind the dropped
 * card and fades (Apple's chip renders: lavender and sky on top, peach and
 * butter below, the colours slowly turning). Two layers: a tight glow that
 * hugs the card's edges and a wide aura behind it. Sits in flow coordinates
 * behind the nodes; the animation lives in globals.css (.vapour-halo).
 */
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
    <div className="vapour-halo" style={{ left: x, top: y, width, height } as CSSProperties} aria-hidden>
      <div className="vapour-halo-layer vapour-halo-glow" />
      <div className="vapour-halo-layer vapour-halo-aura" onAnimationEnd={(e) => e.animationName !== "vapour-spin" && onDone()} />
    </div>
  );
}
