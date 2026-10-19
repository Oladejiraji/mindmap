"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { animate } from "motion";
import { cn } from "@/lib/utils";

/*
 * Gooey switch, ported from rndr-interactions (morph-elements/morph-switch).
 * The thumb is one SVG path: toggling stretches it across the track like
 * liquid, then it settles round with a little overshoot; hovering the far
 * side nudges it toward the pointer. The track turns green when on.
 * Reduced motion: the thumb just moves. Same API as before (checked,
 * onCheckedChange, aria-label, disabled).
 */

// Geometry in the source's 80×40 track space (x 5–85, y 20–60).
const LEFT = "M 25,22 C 34.94,22 43,30.06 43,40 C 43,49.94 34.94,58 25,58 C 15.06,58 7,49.94 7,40 C 7,30.06 15.06,22 25,22 Z";
const RIGHT = "M 65,22 C 74.94,22 83,30.06 83,40 C 83,49.94 74.94,58 65,58 C 55.06,58 47,49.94 47,40 C 47,30.06 55.06,22 65,22 Z";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// How gooey it is (1 = the source: the thumb stretches the whole track).
// Toned down: it stretches halfway, leans half as far, overshoots less.
const GOO = 0.5;
const se = lerp(43, 83, GOO); // stretched edge
const sh = lerp(34.94, 50, GOO); // stretched handle
const STRETCH_RIGHT = `M 25,22 C ${sh},22 ${se},30.06 ${se},40 C ${se},49.94 ${sh},58 25,58 C 15.06,58 7,49.94 7,40 C 7,30.06 15.06,22 25,22 Z`;
const le = lerp(47, 7, GOO);
const lh = lerp(55.06, 40, GOO);
const STRETCH_LEFT = `M 65,22 C 74.94,22 83,30.06 83,40 C 83,49.94 74.94,58 65,58 C ${lh},58 ${le},49.94 ${le},40 C ${le},30.06 ${lh},22 65,22 Z`;
const nudgeRight = (t: number) => {
  const h = lerp(34.94, 42, t * GOO);
  const e = lerp(43, 58, t * GOO);
  return `M 25,22 C ${h},22 ${e},30.06 ${e},40 C ${e},49.94 ${h},58 25,58 C 15.06,58 7,49.94 7,40 C 7,30.06 15.06,22 25,22 Z`;
};
const nudgeLeft = (t: number) => {
  const h = lerp(55.06, 48, t * GOO);
  const e = lerp(47, 32, t * GOO);
  return `M 65,22 C 74.94,22 83,30.06 83,40 C 83,49.94 74.94,58 65,58 C ${h},58 ${e},49.94 ${e},40 C ${e},30.06 ${h},22 65,22 Z`;
};

const SETTLE: [number, number, number, number] = [0.34, 1.25, 0.64, 1];
const GREEN = "oklch(0.8 0.18 152)"; // ≈ #4ade80, as in the source
const OFF = "var(--component-active)";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const shown = useRef(checked); // which side the thumb is drawn on
  const busy = useRef(false);
  const nudged = useRef<string | null>(null);

  // Animate the SVG when `checked` changes (from a click or from outside,
  // e.g. the Preferences menu); syncing a DOM animation is an external effect.
  useEffect(() => {
    const path = pathRef.current;
    if (!path || shown.current === checked) return;
    shown.current = checked;
    nudged.current = null;
    if (reducedMotion()) {
      path.setAttribute("d", checked ? RIGHT : LEFT);
      return;
    }
    busy.current = true;
    (async () => {
      await animate(path, { d: checked ? STRETCH_RIGHT : STRETCH_LEFT }, { duration: 0.2, ease: "easeIn" }).finished;
      await animate(path, { d: checked ? RIGHT : LEFT }, { duration: 0.3, ease: SETTLE }).finished;
      busy.current = false;
    })();
  }, [checked]);

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const path = pathRef.current;
    if (disabled || busy.current || !path || reducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const farSide = checked ? x < 0.5 : x > 0.5;
    if (farSide) {
      const t = Math.max(0, Math.min(1, checked ? 1 - x * 2 : (x - 0.5) * 2));
      nudged.current = checked ? nudgeLeft(t) : nudgeRight(t);
      path.setAttribute("d", nudged.current);
    } else if (nudged.current) {
      nudged.current = null;
      animate(path, { d: checked ? RIGHT : LEFT }, { duration: 0.15 });
    }
  };

  const onLeave = () => {
    const path = pathRef.current;
    if (busy.current || !path || !nudged.current) return;
    const from = nudged.current;
    nudged.current = null;
    animate(path, { d: [from, checked ? RIGHT : LEFT] }, { duration: 0.2, ease: SETTLE });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <svg viewBox="5 20 80 40" className="size-full overflow-visible" aria-hidden>
        <rect
          x="5"
          y="20"
          width="80"
          height="40"
          rx="20"
          style={{ fill: checked ? GREEN : OFF, transition: "fill 400ms ease" }}
        />
        <path ref={pathRef} d={checked ? RIGHT : LEFT} fill="white" />
      </svg>
    </button>
  );
}
