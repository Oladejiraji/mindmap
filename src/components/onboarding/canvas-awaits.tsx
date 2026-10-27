"use client";

/*
 * "The canvas awaits": the whole panel is the canvas, and one node waits
 * in its centre, in our blue: "How do we get started on Mindmap?", with
 * Kurosawa (photo, name, "is researching…") above it as on the earlier
 * slides. It drops
 * in and fires the auth page's pulse (VapourHalo) as it comes to rest, like
 * dropping a card on the auth canvas; then the chat composer slides up at
 * the foot, ready for the first question. Reduced
 * motion shows it finished, without the pulses. Laid out at the panel's
 * 578 × 318 and scaled to fit.
 */
import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { ArrowUp } from "lucide-react";
import KurosawaAvatar from "../../../public/walkthrough/kurosawa.png";
import { VapourHalo } from "@/components/auth-canvas/vapour-halo";
import "./canvas-awaits.css";

const W = 578;
const H = 318;

// The node: centre x, y, width; 32px tall like the cards on "Your team's
// research in one place". lands: when it comes to rest (ms).
// The card (32px, like the cards on "Your team's research in one place"),
// with who's on it above it, outside the card, as on that slide
const NODE_H = 32;
const TAG = { h: 20, gap: 6 };
type Node = { x: number; y: number; w: number; title: string; name: string; avatar: StaticImageData; lands: number };
const NODES: Node[] = [
  {
    x: W / 2,
    y: H / 2,
    w: 268,
    title: "How do we get started on Mindmap?",
    name: "Kurosawa",
    avatar: KurosawaAvatar,
    lands: 620,
  },
];
// Each node drops in over this long before it lands
const DROP_MS = 320;

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

      {/* The node, in our blue, dropping in to rest */}
      {NODES.map((n) => (
        <div
          key={n.title}
          className="ca-drop absolute"
          style={{
            left: n.x - n.w / 2,
            top: n.y - NODE_H / 2 - TAG.h - TAG.gap,
            width: n.w,
            animationDelay: `${n.lands - DROP_MS}ms`,
            animationDuration: `${DROP_MS}ms`,
          }}
        >
          {/* Who: photo ringed in their colour, name, "is researching…" */}
          <div className="mb-1.5 flex h-5 items-center gap-1.5">
            <Image src={n.avatar} alt="" width={16} height={16} className="rounded-full ring-[1.5px] ring-brand-solid" />
            <span className="text-caption-base font-medium text-fg-primary">{n.name}</span>
            <p className="t-shimmer text-[12px] leading-4 font-normal" data-text="is researching…">
              is researching…
            </p>
          </div>
          <div
            className="corner-squircle flex items-center justify-center rounded-4xl bg-brand-solid px-3 text-body-sm text-white shadow-node-primary"
            style={{ height: NODE_H }}
          >
            <span className="truncate">{n.title}</span>
          </div>
        </div>
      ))}

      {/* The chat composer, ready for the first question */}
      <div
        className="ca-rise absolute bottom-6 left-1/2 flex h-10 w-[320px] -translate-x-1/2 items-center gap-2 rounded-full bg-white pr-1.5 pl-4 shadow-default"
        style={{ animationDelay: "1000ms" }}
      >
        <span className="flex-1 text-[13px] text-[oklch(0.68_0_0)]">Ask anything…</span>
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-solid text-white">
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
}
