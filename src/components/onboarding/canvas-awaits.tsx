"use client";

/*
 * "The canvas awaits": a square window onto the canvas. The dot grid, the
 * project from the earlier slides as a selected node, two branches drawn
 * down from it to its forks, and the chat composer at the foot, ready for
 * the first question. It blurs in, then the nodes pop in, the edges draw
 * and the composer slides up; reduced motion shows it finished. Laid out
 * at the panel's 578 × 318 and scaled to fit.
 */
import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import "./canvas-awaits.css";

const W = 578;
const H = 318;
const SQUARE = 260;

// Nodes inside the square: centre x, y and width (all 28px tall)
const NODE_H = 28;
const ROOT = { x: 130, y: 62, w: 176, title: "Build a group research tool" };
const FORKS = [
  { x: 72, y: 136, w: 112, title: "User interviews", at: 1000 },
  { x: 190, y: 136, w: 104, title: "Core features", at: 1100 },
];

// From the root's foot down to a fork's head
const edge = (to: (typeof FORKS)[number]) => {
  const y1 = ROOT.y + NODE_H / 2;
  const y2 = to.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M${ROOT.x} ${y1} C${ROOT.x} ${mid} ${to.x} ${mid} ${to.x} ${y2}`;
};

export function CanvasAwaits() {
  const stageRef = useRef<HTMLDivElement>(null);

  // Draw at the panel's scale, keeping the 578 × 318 layout
  useEffect(() => {
    const stage = stageRef.current;
    const panel = stage?.parentElement;
    if (!stage || !panel) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      stage.style.scale = String(Math.min(width / W, height / H));
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  const node = "absolute flex items-center justify-center rounded-[10px] bg-white px-2.5 text-[11px] leading-none text-[oklch(0.22_0.012_262)] shadow-node";

  return (
    <div
      ref={stageRef}
      className="canvas-awaits absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      {/* The window onto the canvas */}
      <div
        className="ca-in ca-square corner-squircle absolute overflow-hidden rounded-4xl bg-white shadow-node"
        style={{ width: SQUARE, height: SQUARE, left: (W - SQUARE) / 2, top: (H - SQUARE) / 2 }}
      >
        {/* Edges from the project to its forks */}
        <svg viewBox={`0 0 ${SQUARE} ${SQUARE}`} className="absolute inset-0 size-full" fill="none">
          {FORKS.map((f, i) => (
            <path key={f.title} d={edge(f)} pathLength={1} className="ca-edge" style={{ animationDelay: `${700 + i * 100}ms` }} />
          ))}
        </svg>

        {/* The project, selected, and its forks */}
        <div
          className={`ca-pop ${node} ring-2 ring-brand-solid`}
          style={{ left: ROOT.x - ROOT.w / 2, top: ROOT.y - NODE_H / 2, width: ROOT.w, height: NODE_H, animationDelay: "450ms" }}
        >
          <span className="truncate">{ROOT.title}</span>
        </div>
        {FORKS.map((f) => (
          <div
            key={f.title}
            className={`ca-pop ${node}`}
            style={{ left: f.x - f.w / 2, top: f.y - NODE_H / 2, width: f.w, height: NODE_H, animationDelay: `${f.at}ms` }}
          >
            <span className="truncate">{f.title}</span>
          </div>
        ))}

        {/* The chat composer, ready for the first question */}
        <div
          className="ca-rise absolute right-3 bottom-3 left-3 flex h-9 items-center gap-2 rounded-full bg-white pr-1.5 pl-3.5 shadow-default"
          style={{ animationDelay: "1350ms" }}
        >
          <span className="flex-1 text-[11px] text-[oklch(0.68_0_0)]">Ask anything…</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-solid text-white">
            <ArrowUp className="size-3.5" strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </div>
  );
}
