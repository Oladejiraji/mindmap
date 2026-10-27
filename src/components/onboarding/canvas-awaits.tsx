"use client";

/*
 * "The canvas awaits": the whole panel is the canvas. The project from the
 * earlier slides drops in as a selected node, edges draw down from it, its
 * two forks drop in, and the chat composer slides up at the foot, ready for
 * the first question. Each node fires the auth page's pulse (VapourHalo)
 * as it comes to rest, like dropping a card on the auth canvas. Reduced
 * motion shows it finished, without the pulses. Laid out at the panel's
 * 578 × 318 and scaled to fit.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { VapourHalo } from "@/components/auth-canvas/vapour-halo";
import "./canvas-awaits.css";

const W = 578;
const H = 318;

// Nodes on the canvas: centre x, y, width; 32px tall like the cards on
// "Your team's research in one place". lands: when it comes to rest (ms).
const NODE_H = 32;
type Node = { x: number; y: number; w: number; title: string; lands: number; selected?: boolean };
const ROOT: Node = { x: W / 2, y: 76, w: 212, title: "Build a group research tool", lands: 620, selected: true };
const FORKS: Node[] = [
  { x: 196, y: 162, w: 150, title: "User interviews", lands: 1320 },
  { x: 382, y: 162, w: 140, title: "Core features", lands: 1420 },
];
const NODES = [ROOT, ...FORKS];
// Each node drops in over this long before it lands
const DROP_MS = 320;

// From the project's foot down to a fork's head
const edge = (to: Node) => {
  const y1 = ROOT.y + NODE_H / 2;
  const y2 = to.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M${ROOT.x} ${y1} C${ROOT.x} ${mid} ${to.x} ${mid} ${to.x} ${y2}`;
};

export function CanvasAwaits() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [halos, setHalos] = useState<number[]>([]);

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

  // The pulse as each node comes to rest
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers = NODES.map((n, i) => window.setTimeout(() => setHalos((h) => [...h, i]), n.lands));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      ref={stageRef}
      className="canvas-awaits absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      {/* The pulses, behind everything */}
      {halos.map((i) => {
        const n = NODES[i];
        return (
          <VapourHalo
            key={i}
            x={n.x - n.w / 2}
            y={n.y - NODE_H / 2}
            width={n.w}
            height={NODE_H}
            onDone={() => setHalos((h) => h.filter((k) => k !== i))}
          />
        );
      })}

      {/* Edges from the project down to its forks */}
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" fill="none">
        {FORKS.map((f, i) => (
          <path key={f.title} d={edge(f)} pathLength={1} className="ca-edge" style={{ animationDelay: `${780 + i * 100}ms` }} />
        ))}
      </svg>

      {/* The nodes, dropping in to rest */}
      {NODES.map((n) => (
        <div
          key={n.title}
          className={`ca-drop corner-squircle absolute flex items-center justify-center rounded-4xl bg-white px-3 text-body-sm text-[oklch(0.22_0.012_262)] shadow-node ${n.selected ? "ring-2 ring-brand-solid" : ""}`}
          style={{
            left: n.x - n.w / 2,
            top: n.y - NODE_H / 2,
            width: n.w,
            height: NODE_H,
            animationDelay: `${n.lands - DROP_MS}ms`,
            animationDuration: `${DROP_MS}ms`,
          }}
        >
          <span className="truncate">{n.title}</span>
        </div>
      ))}

      {/* The chat composer, ready for the first question */}
      <div
        className="ca-rise absolute bottom-6 left-1/2 flex h-10 w-[320px] -translate-x-1/2 items-center gap-2 rounded-full bg-white pr-1.5 pl-4 shadow-default"
        style={{ animationDelay: "1650ms" }}
      >
        <span className="flex-1 text-[13px] text-[oklch(0.68_0_0)]">Ask anything…</span>
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-solid text-white">
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
}
