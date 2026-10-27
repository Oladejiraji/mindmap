"use client";

/*
 * "The canvas awaits": the whole panel is the canvas. The first node
 * appears hovering above it, in focus, and "So how do you get started on
 * Mindmap?" types into it while Kurosawa "is typing…". Then it settles
 * onto the canvas and his tag becomes "created a nexus point"; from the
 * moment it comes to rest the auth page's pulse (VapourHalo) beats round
 * it rhythmically, and subtle wireframes of connectors and empty nodes
 * draw out below it. Kurosawa's tag sits above the card, as on the earlier
 * slides. Reduced motion shows it settled, without the pulse.
 * Laid out at the panel's 578 × 318 and scaled to fit.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import KurosawaAvatar from "../../../public/walkthrough/kurosawa.png";
import { VapourHalo } from "@/components/auth-canvas/vapour-halo";
import { cn } from "@/lib/utils";
import "./canvas-awaits.css";

const W = 578;
const H = 318;

// The node: a 32px blue card centred on the canvas, Kurosawa's tag above it
const NODE = { x: W / 2, y: H / 2, w: 300, h: 32 };
const TAG = { h: 20, gap: 6 };
const QUESTION = "So how do you get started on Mindmap?";

// Timing (ms): it appears hovering, the question types in, then it settles
const TYPE_FROM = 600;
const TYPE_MS = 45;
const SETTLE_AT = TYPE_FROM + QUESTION.length * TYPE_MS + 400;
const SETTLE_MS = 380;
// Once it's at rest, the pulse beats this often
const BEAT_MS = 3000;

// Wireframes of what could grow from it: thin connectors from the node's
// foot to empty dashed nodes below, in subtle greys, drawn once it settles
const GHOST = { y: 252, w: 112, h: 28 };
const GHOSTS = [NODE.x - 150, NODE.x, NODE.x + 150];
const wire = (gx: number) => {
  const y1 = NODE.y + NODE.h / 2;
  const y2 = GHOST.y - GHOST.h / 2;
  const mid = (y1 + y2) / 2;
  return `M${NODE.x} ${y1} C${NODE.x} ${mid} ${gx} ${mid} ${gx} ${y2}`;
};

export function CanvasAwaits() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [typed, setTyped] = useState(reduced ? QUESTION.length : 0);
  const [settled, setSettled] = useState(reduced);
  // Each beat is its own halo (they overlap a little as one fades)
  const [beats, setBeats] = useState<number[]>([]);

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

  // Type the question, then settle the node and pulse as it lands
  useEffect(() => {
    if (reduced) return;
    const timers = [...QUESTION].map((_, i) => window.setTimeout(() => setTyped(i + 1), TYPE_FROM + i * TYPE_MS));
    timers.push(window.setTimeout(() => setSettled(true), SETTLE_AT));
    let beat = 0;
    let interval = 0;
    const pulse = () => setBeats((b) => [...b, ++beat]);
    timers.push(
      window.setTimeout(() => {
        pulse();
        interval = window.setInterval(pulse, BEAT_MS);
      }, SETTLE_AT + SETTLE_MS - 60),
    );
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [reduced]);

  return (
    <div
      ref={stageRef}
      className="canvas-awaits absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      {/* The pulse, beating behind the node once it's at rest */}
      {beats.map((b) => (
        <VapourHalo
          key={b}
          x={NODE.x - NODE.w / 2}
          y={NODE.y - NODE.h / 2}
          width={NODE.w}
          height={NODE.h}
          onDone={() => setBeats((all) => all.filter((k) => k !== b))}
        />
      ))}

      {/* The wireframes: connectors and empty nodes, once it's at rest */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={cn("ca-wires absolute inset-0 size-full", settled && "ca-wires-on")}
        fill="none"
        style={{ ["--ca-wires-at" as string]: `${SETTLE_MS + 200}ms` }}
      >
        {GHOSTS.map((gx, i) => (
          <g key={gx} style={{ ["--i" as string]: i }}>
            <path d={wire(gx)} pathLength={1} className="ca-wire" />
            <rect
              className="ca-ghost"
              x={gx - GHOST.w / 2}
              y={GHOST.y - GHOST.h / 2}
              width={GHOST.w}
              height={GHOST.h}
              rx={14}
            />
          </g>
        ))}
      </svg>

      <div
        className={cn("ca-node absolute", settled && "ca-settled")}
        style={{
          left: NODE.x - NODE.w / 2,
          top: NODE.y - NODE.h / 2 - TAG.h - TAG.gap,
          width: NODE.w,
          ["--ca-settle" as string]: `${SETTLE_MS}ms`,
        }}
      >
        {/* Who: photo in his blue ring, name, and what he's doing */}
        <div className="mb-1.5 flex h-5 items-center gap-1.5">
          <Image src={KurosawaAvatar} alt="" width={16} height={16} className="rounded-full ring-[1.5px] ring-brand-solid" />
          <span className="text-caption-base font-medium text-fg-primary">Kurosawa</span>
          {settled ? (
            <span key="created" className="ca-swap text-[12px] leading-4 font-normal text-[oklch(0.68_0_0)]">
              created a nexus point
            </span>
          ) : (
            <p className="t-shimmer text-[12px] leading-4 font-normal" data-text="is typing…">
              is typing…
            </p>
          )}
        </div>
        {/* The card: in focus while it's typed into, then settled */}
        <div
          className="ca-card corner-squircle flex items-center rounded-4xl bg-brand-solid px-4 text-body-sm text-white"
          style={{ height: NODE.h }}
        >
          <span className="truncate">{QUESTION.slice(0, typed)}</span>
          {!settled && <span className="ca-caret ml-px h-4 w-px shrink-0 bg-white" />}
        </div>
      </div>

    </div>
  );
}
