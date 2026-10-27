"use client";

/*
 * "The canvas awaits": the whole panel is the canvas. The first node
 * appears hovering above it, in focus, and "So how do you get started on
 * Mindmap?" types into it while Kurosawa "is typing…". Then it settles
 * onto the canvas, firing the auth page's pulse (VapourHalo) as it comes
 * to rest, and his tag becomes "created a nexus point". The chat composer
 * slides up at the foot. Kurosawa's tag sits above the card, as on the
 * earlier slides. Reduced motion shows it settled, without the pulse.
 * Laid out at the panel's 578 × 318 and scaled to fit.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
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

export function CanvasAwaits() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [typed, setTyped] = useState(reduced ? QUESTION.length : 0);
  const [settled, setSettled] = useState(reduced);
  const [pulse, setPulse] = useState(false);

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
    timers.push(window.setTimeout(() => setPulse(true), SETTLE_AT + SETTLE_MS - 60));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return (
    <div
      ref={stageRef}
      className="canvas-awaits absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      {/* The pulse as the node comes to rest, behind it */}
      {pulse && (
        <VapourHalo
          x={NODE.x - NODE.w / 2}
          y={NODE.y - NODE.h / 2}
          width={NODE.w}
          height={NODE.h}
          onDone={() => setPulse(false)}
        />
      )}

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

      {/* The chat composer, ready for the first question */}
      <div
        className="ca-rise absolute bottom-6 left-1/2 flex h-10 w-[320px] -translate-x-1/2 items-center gap-2 rounded-full bg-white pr-1.5 pl-4 shadow-default"
        style={{ animationDelay: `${SETTLE_AT + SETTLE_MS + 200}ms` }}
      >
        <span className="flex-1 text-[13px] text-[oklch(0.68_0_0)]">Ask anything…</span>
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-solid text-white">
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
}
