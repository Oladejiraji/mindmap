"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { animate } from "motion";
import { cn } from "@/lib/utils";

/*
 * Gooey switch, ported from rndr-interactions (morph-elements/morph-switch).
 * The thumb is one SVG path: toggling stretches it across the track like
 * liquid, then it settles round with a little overshoot; hovering the far
 * side nudges it toward the pointer. The track turns brand blue when on.
 * 34×20 track, 16×16 thumb. Reduced motion: the thumb just moves. Same
 * API as before (checked, onCheckedChange, aria-label, disabled).
 */

// Geometry in px: a 34×20 track with a 16×16 thumb (2px inset), so the
// thumb rests centred at x=10 (off) or x=24 (on). The thumb is a circle
// drawn as four Béziers; stretching moves one side's edge and handle.
const W = 34;
const R = 8;
const K = 4.418; // Bézier circle constant × R
const OFF_X = 10;
const ON_X = 24;
const TRAVEL = ON_X - OFF_X;

function thumb(cx: number, rightEdge: number, rightHandle: number, leftEdge: number, leftHandle: number) {
  const top = 10 - R;
  const bottom = 10 + R;
  return `M ${cx},${top} C ${rightHandle},${top} ${rightEdge},${10 - K} ${rightEdge},10 C ${rightEdge},${10 + K} ${rightHandle},${bottom} ${cx},${bottom} C ${leftHandle},${bottom} ${leftEdge},${10 + K} ${leftEdge},10 C ${leftEdge},${10 - K} ${leftHandle},${top} ${cx},${top} Z`;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// How gooey it is (1 = the source: the thumb stretches the whole track).
// Toned down: it stretches halfway, leans half as far, overshoots less.
// Offsets are the source's, scaled to this track's 14px of travel.
const GOO = 0.5;
const STRETCH_HANDLE = TRAVEL * (25 / 40);
const NUDGE_HANDLE = TRAVEL * (7.06 / 40);
const NUDGE_EDGE = TRAVEL * (15 / 40);

const LEFT = thumb(OFF_X, OFF_X + R, OFF_X + K, OFF_X - R, OFF_X - K);
const RIGHT = thumb(ON_X, ON_X + R, ON_X + K, ON_X - R, ON_X - K);
const STRETCH_RIGHT = thumb(OFF_X, lerp(OFF_X + R, W - 2, GOO), lerp(OFF_X + K, OFF_X + STRETCH_HANDLE, GOO), OFF_X - R, OFF_X - K);
const STRETCH_LEFT = thumb(ON_X, ON_X + R, ON_X + K, lerp(ON_X - R, 2, GOO), lerp(ON_X - K, ON_X - STRETCH_HANDLE, GOO));
const nudgeRight = (t: number) =>
  thumb(OFF_X, OFF_X + R + NUDGE_EDGE * t * GOO, OFF_X + K + NUDGE_HANDLE * t * GOO, OFF_X - R, OFF_X - K);
const nudgeLeft = (t: number) =>
  thumb(ON_X, ON_X + R, ON_X + K, ON_X - R - NUDGE_EDGE * t * GOO, ON_X - K - NUDGE_HANDLE * t * GOO);

const SETTLE: [number, number, number, number] = [0.34, 1.25, 0.64, 1];
const ON = "var(--brand-solid)"; // the app's brand blue
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
  const activeAnimation = useRef<ReturnType<typeof animate> | null>(null);

  // Animate the SVG when `checked` changes (from a click or from outside,
  // e.g. the Preferences menu); syncing a DOM animation is an external effect.
  useEffect(() => {
    const path = pathRef.current;
    if (!path || shown.current === checked) return;
    shown.current = checked;
    nudged.current = null;
    activeAnimation.current?.stop();
    if (reducedMotion()) {
      path.setAttribute("d", checked ? RIGHT : LEFT);
      return;
    }
    busy.current = true;
    let cancelled = false;
    const run = async () => {
      const stretch = animate(path, { d: checked ? STRETCH_RIGHT : STRETCH_LEFT }, { duration: 0.2, ease: "easeIn" });
      activeAnimation.current = stretch;
      await stretch.finished;
      if (cancelled) return;
      const settle = animate(path, { d: checked ? RIGHT : LEFT }, { duration: 0.3, ease: SETTLE });
      activeAnimation.current = settle;
      await settle.finished;
      if (cancelled) return;
      busy.current = false;
    };
    void run();
    return () => {
      cancelled = true;
      activeAnimation.current?.stop();
      activeAnimation.current = null;
    };
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
        "relative inline-flex h-5 w-[34px] shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <svg viewBox="0 0 34 20" className="size-full overflow-visible" aria-hidden>
        <rect
          width="34"
          height="20"
          rx="10"
          style={{ fill: checked ? ON : OFF, transition: "fill 400ms ease" }}
        />
        <path ref={pathRef} d={checked ? RIGHT : LEFT} fill="white" />
      </svg>
    </button>
  );
}
