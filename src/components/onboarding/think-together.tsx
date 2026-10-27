"use client";

/*
 * "Think together": the team from the last slide as thought bubbles around
 * their shared project. "Build a group research tool" sits in the middle;
 * Kurosawa, Deji, Stephen and a dashed "+" (invite someone) float around it
 * as round bubbles in their ring colours, each with a trail of small
 * circles shrinking in towards the project, like a thought bubble's. They
 * pop in (project, then each trail and bubble), then bob gently, each on
 * its own rhythm. Reduced motion shows them still. Laid out at the panel's
 * 578 × 318 and scaled to fit.
 */
import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { Plus } from "lucide-react";
import DejiAvatar from "../../../public/walkthrough/deji.png";
import KurosawaAvatar from "../../../public/walkthrough/kurosawa.png";
import StephenAvatar from "../../../public/walkthrough/stephen.png";
import "./think-together.css";

const W = 578;
const H = 318;
const CENTRE = { x: W / 2, y: H / 2 };
const PILL = { w: 212, h: 32 };
const SIZE = 56;

// The bubbles: where each sits, and its colour (the ring colours from
// "Your team's research in one place"). No avatar: the invite.
type Bubble = { key: string; x: number; y: number; ring: string; avatar?: StaticImageData; bob: number };
const BUBBLES: Bubble[] = [
  { key: "Kurosawa", x: 150, y: 66, ring: "var(--brand-solid)", avatar: KurosawaAvatar, bob: 0 },
  { key: "Deji", x: 432, y: 62, ring: "oklch(0.58 0.21 300)", avatar: DejiAvatar, bob: 700 },
  { key: "Stephen", x: 158, y: 254, ring: "oklch(0.76 0.16 75)", avatar: StephenAvatar, bob: 1400 },
  { key: "invite", x: 424, y: 256, ring: "oklch(0.78 0 0)", bob: 2100 },
];

// A thought bubble's trail: two circles between the bubble and the pill,
// shrinking towards the pill (at these fractions of the way, these sizes)
const TRAIL = [
  { at: 0.42, size: 10 },
  { at: 0.66, size: 6 },
];

// Where the trail ends: the nearest point of the pill's edge, roughly
const pillEdge = (b: Bubble) => ({
  x: CENTRE.x + Math.sign(b.x - CENTRE.x) * (PILL.w / 2 - 24),
  y: CENTRE.y + Math.sign(b.y - CENTRE.y) * (PILL.h / 2),
});

export function ThinkTogether() {
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

  return (
    <div
      ref={stageRef}
      className="think-together absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      {/* The shared thought: the project */}
      <div
        className="tt-pop corner-squircle absolute flex items-center justify-center rounded-4xl bg-white text-body-sm text-[oklch(0.22_0.012_262)] shadow-node"
        style={{
          left: CENTRE.x - PILL.w / 2,
          top: CENTRE.y - PILL.h / 2,
          width: PILL.w,
          height: PILL.h,
          animationDelay: "150ms",
        }}
      >
        Build a group research tool
      </div>

      {BUBBLES.map((b, i) => {
        const end = pillEdge(b);
        const at = 350 + i * 140;
        const invite = !b.avatar;
        return (
          <div key={b.key} className="tt-bob absolute inset-0" style={{ animationDelay: `${b.bob}ms` }}>
            {/* The trail, shrinking in towards the project */}
            {TRAIL.map((t, j) => (
              <span
                key={j}
                className="tt-pop absolute rounded-full bg-white"
                style={{
                  left: b.x + (end.x - b.x) * t.at - t.size / 2,
                  top: b.y + (end.y - b.y) * t.at - t.size / 2,
                  width: t.size,
                  height: t.size,
                  border: `1.5px ${invite ? "dashed" : "solid"} ${b.ring}`,
                  animationDelay: `${at + (TRAIL.length - j) * 70}ms`,
                }}
              />
            ))}
            {/* The bubble: their photo in their colour, or the invite */}
            {b.avatar ? (
              <Image
                src={b.avatar}
                alt=""
                width={SIZE}
                height={SIZE}
                className="tt-pop absolute rounded-full ring-2 ring-(--tt-ring) ring-offset-2 ring-offset-white"
                style={{
                  left: b.x - SIZE / 2,
                  top: b.y - SIZE / 2,
                  ["--tt-ring" as string]: b.ring,
                  animationDelay: `${at + 220}ms`,
                }}
              />
            ) : (
              <span
                className="tt-pop absolute flex items-center justify-center rounded-full bg-white"
                style={{ left: b.x - SIZE / 2, top: b.y - SIZE / 2, width: SIZE, height: SIZE, animationDelay: `${at + 220}ms` }}
              >
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full" fill="none">
                  <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={SIZE / 2 - 1}
                    stroke={b.ring}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
                <Plus className="size-5 text-[oklch(0.6_0_0)]" strokeWidth={1.75} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
