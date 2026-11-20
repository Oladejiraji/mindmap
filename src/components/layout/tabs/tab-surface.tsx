"use client";

import { useCallback, useId, useLayoutEffect, useRef, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { surfaceCorners, surfacePath, type SurfaceGeometry } from "./tab-surface-path";

/*
 * The active tab and the panel below, drawn as one SVG shape behind both.
 * useTabSurface measures the active tab ([data-tab-active]) after every
 * render and moves the shape to it: a spring when you switch tabs, a jump
 * while scrolling or dragging. During a drag the panel's corners are held
 * (they can shrink to make room, not grow back). Sizes live in motion
 * values, so resizing never re-renders React.
 */

// The theme's --radius-3xl (panel) and --radius-xl (tab).
const PANEL_RADIUS = 16;
const TAB_RADIUS = 10;
const SPRING = { type: "spring", duration: 0.32, bounce: 0.12 } as const;

export function useTabSurface(scrollerRef: RefObject<HTMLElement | null>) {
  // animate() doesn't read MotionConfig, so reduced motion is checked here.
  const reduceMotion = useReducedMotion();
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const top = useMotionValue(0);
  const tabLeft = useMotionValue(0);
  const tabWidth = useMotionValue(0);
  const tabHeight = useMotionValue(0);
  const maxCornerLeft = useMotionValue(PANEL_RADIUS);
  const maxCornerRight = useMotionValue(PANEL_RADIUS);
  const target = useRef<{ left: number; width: number } | null>(null);
  /** Set while a tab is dragged: the shape follows it via place("jump"). */
  const following = useRef(false);

  const geometry = (): SurfaceGeometry => ({
    width: width.get(),
    height: height.get(),
    top: top.get(),
    tabLeft: tabLeft.get(),
    tabWidth: tabWidth.get(),
    tabHeight: tabHeight.get(),
    radius: PANEL_RADIUS,
    tabRadius: TAB_RADIUS,
    maxCornerLeft: maxCornerLeft.get(),
    maxCornerRight: maxCornerRight.get(),
  });
  const d = useTransform(() => surfacePath(geometry()));
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  /**
   * Draws the shape now. Motion draws on the next frame, which is a frame
   * late when called from a ResizeObserver (it runs just before paint): while
   * the panel slides open, the shape would trail the tabs it wraps.
   */
  const paint = () => {
    svgRef.current?.style.setProperty("width", `${width.get()}px`);
    svgRef.current?.style.setProperty("height", `${height.get()}px`);
    pathRef.current?.setAttribute("d", surfacePath(geometry()));
  };

  // Positions are relative to the strip (the SVG's origin), which may hold
  // more than the scroller (e.g. the tab search button on its left).
  /** Where the tab is drawn right now, including drag and layout-animation transforms. */
  const drawnLeft = (tab: HTMLElement) => {
    const strip = scrollerRef.current?.parentElement;
    return strip ? tab.getBoundingClientRect().left - strip.getBoundingClientRect().left : 0;
  };
  /** The tab's layout slot, ignoring transforms. */
  const slotLeft = (tab: HTMLElement) => {
    const scroller = scrollerRef.current;
    return scroller ? scroller.offsetLeft + tab.offsetLeft - scroller.scrollLeft : 0;
  };

  const place = useCallback(
    (how: "glide" | "jump") => {
      const scroller = scrollerRef.current;
      const tab = scroller?.querySelector<HTMLElement>("[data-tab-active]");
      if (!scroller || !tab) {
        target.current = null;
        tabWidth.jump(0);
        return;
      }
      // Gliding aims at the tab's layout slot (ignoring drag and layout
      // animation transforms); jumping follows where it's drawn right now.
      const left = how === "jump" ? drawnLeft(tab) : slotLeft(tab);
      const next = { left, width: tab.offsetWidth };
      const prev = target.current;
      target.current = next;
      tabHeight.jump(tab.offsetHeight);
      if (how === "jump" || !prev || reduceMotion) {
        tabLeft.jump(next.left);
        tabWidth.jump(next.width);
      } else if (prev.left !== next.left || prev.width !== next.width) {
        animate(tabLeft, next.left, SPRING);
        animate(tabWidth, next.width, SPRING);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawnLeft/slotLeft only read refs
    [scrollerRef, reduceMotion, tabHeight, tabLeft, tabWidth],
  );

  /** Ref for the strip: the shape spans its parent (strip + panel) and follows its size. */
  const stripRef = useCallback(
    (strip: HTMLElement | null) => {
      const column = strip?.parentElement;
      if (!strip || !column) return;
      const observer = new ResizeObserver(() => {
        width.jump(column.clientWidth);
        height.jump(column.clientHeight);
        top.jump(strip.offsetHeight);
        place("jump");
        paint();      });
      observer.observe(column);
      return () => observer.disconnect();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paint only reads refs and motion values
    [width, height, top, place],
  );

  /**
   * A drag starts on `tab`: follow it, and hold the panel's corners as they
   * are around it. Measured from the dragged tab, not the shape, which may
   * still be on the previous tab (dragging a tab also opens it).
   */
  const startFollowing = (tab: HTMLElement) => {
    following.current = true;
    const corners = surfaceCorners({ ...geometry(), tabLeft: drawnLeft(tab), tabWidth: tab.offsetWidth });
    maxCornerLeft.jump(corners.left);
    maxCornerRight.jump(corners.right);
  };
  /**
   * The drag ends on `tab`: keep following it while it springs into its
   * slot (Reorder animates that), so the shape and the tab land together.
   * Once it has settled, ease the corners back (a cap at full radius is no
   * cap) and go back to gliding.
   */
  const stopFollowing = (tab: HTMLElement) => {
    // At most ~1.5s of frames, in case it never lands exactly.
    let frames = 90;
    const settle = () => {
      place("jump");
      if (tab.isConnected && Math.abs(drawnLeft(tab) - slotLeft(tab)) > 0.5 && --frames > 0) {
        requestAnimationFrame(settle);
        return;
      }
      following.current = false;
      target.current = null;
      for (const cap of [maxCornerLeft, maxCornerRight]) {
        if (reduceMotion) cap.jump(PANEL_RADIUS);
        else animate(cap, PANEL_RADIUS, SPRING);
      }
      place("glide");
    };
    requestAnimationFrame(settle);
  };

  // After every render the active tab may have changed or moved; the DOM
  // is the source of truth for where it is.
  useLayoutEffect(() => {
    if (!following.current) place("glide");
  });

  return { stripRef, place, following, startFollowing, stopFollowing, surface: { d, width, height, svgRef, pathRef } };
}

export function TabSurface({
  d,
  width,
  height,
  svgRef,
  pathRef,
}: {
  d: MotionValue<string>;
  width: MotionValue<number>;
  height: MotionValue<number>;
  svgRef: RefObject<SVGSVGElement | null>;
  pathRef: RefObject<SVGPathElement | null>;
}) {
  const gradientId = useId();
  return (
    // z-1: above the inactive tabs (z auto), below the active tab (z-10) and
    // the panel's content (z-2). So the active tab is the surface itself and
    // covers what it passes over, dragged or not.
    <motion.svg ref={svgRef} aria-hidden style={{ width, height }} className="pointer-events-none absolute top-0 left-0 z-1 overflow-visible">
      <defs>
        {/* The panel's gradient (--gradient-panel), relative to the shape so it needs no size. */}
        <radialGradient id={gradientId} cx={0} cy={0} r={1} gradientTransform="translate(0.5 0) scale(1.2 0.95)">
          <stop offset={0.35} style={{ stopColor: "var(--surface-page)" }} />
          <stop offset={1} style={{ stopColor: "var(--surface-panel-edge)" }} />
        </radialGradient>
      </defs>
      {/* Outline and shadow to match the panel's shadow-default. */}
      <motion.path
        ref={pathRef}
        d={d}
        fill={`url(#${gradientId})`}
        strokeWidth={1}
        className="stroke-black/6 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.05))_drop-shadow(0_1px_2px_rgb(0_0_0/0.04))]"
      />
    </motion.svg>
  );
}
