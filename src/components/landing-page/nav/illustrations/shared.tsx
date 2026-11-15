import React from "react";
import type { ISolid } from "./iso";

/** Every scene is drawn on this canvas: the promo slot is 240 × 286. */
export const VIEW_BOX = "0 0 240 286";

/** Colours come from CSS variables set per theme in `index.tsx`. */
export const C = {
  plate: "var(--illo-plate)",
  line: "var(--illo-line)",
  muted: "var(--illo-muted)",
  ink: "var(--illo-ink)",
};

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Gentler than EASE, so short shapes are seen growing rather than popping. */
export const GROW = [0.45, 0, 0.2, 1] as const;

/** Falls a short way and settles with a small bounce. */
export function drop(delay = 0) {
  return {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      y: { type: "spring", visualDuration: 0.4, bounce: 0.35, delay },
      opacity: { duration: 0.12, delay },
    },
  } as const;
}

/**
 * Draws a stroke in. Opacity snaps on as drawing starts: at pathLength 0 a
 * round linecap still renders as a dot.
 */
export function draw(delay = 0, duration = 0.9) {
  return {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration, delay, ease: EASE },
      opacity: { duration: 0.01, delay },
    },
  };
}

/** A solid filled with the plate, so it hides what's behind: outline plus one dim crease. */
export function Solid({ solid, edge = C.muted }: { solid: ISolid; edge?: string }) {
  return (
    <g>
      <path d={solid.sil} fill={C.plate} stroke={edge} strokeLinejoin="round" />
      <path d={solid.crease} fill="none" stroke={C.line} strokeLinejoin="round" />
    </g>
  );
}
