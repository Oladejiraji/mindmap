"use client";

/*
 * "Think together": the team from the last slide, Kurosawa, Deji and
 * Stephen, as an overlapping row of photos in their ring colours, and a
 * "+" in a dashed circle to invite someone else. Each one is a step bigger
 * than the one before (28, 34, 39, then 45 for the +), like a thought
 * bubble's trail growing; they blur in one after another. Then a sphere of
 * AI model logos explodes out of the centre around them, each in a white
 * circle, and turns slowly: near logos are bigger, closer and pass in front
 * of the row; far ones shrink, fade, blur and go behind. Reduced motion
 * shows the sphere still.
 */
import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import Image, { type StaticImageData } from "next/image";
import { Plus } from "lucide-react";
import DejiAvatar from "../../../public/walkthrough/deji.png";
import KurosawaAvatar from "../../../public/walkthrough/kurosawa.png";
import StephenAvatar from "../../../public/walkthrough/stephen.png";
import {
  AnthropicLogo,
  ClaudeLogo,
  CopilotLogo,
  GeminiLogo,
  HuggingFaceLogo,
  MetaLogo,
  OllamaLogo,
  OpenAILogo,
  PerplexityLogo,
  XLogo,
} from "./tool-logos";
import "./think-together.css";

// Same people and ring colours as "Your team's research in one place"
const TEAM: { name: string; avatar: StaticImageData; ring: string }[] = [
  { name: "Kurosawa", avatar: KurosawaAvatar, ring: "var(--brand-solid)" },
  { name: "Deji", avatar: DejiAvatar, ring: "oklch(0.58 0.21 300)" },
  { name: "Stephen", avatar: StephenAvatar, ring: "oklch(0.76 0.16 75)" },
];
// Sizes grow a step along the row (30% smaller than 40/48/56/64); the + is
// the next step
const SIZES = [28, 34, 39];
const INVITE = 45;

// The models' logos for the sphere, in brand colour (Hugging Face's yellow
// deepened so it holds on white)
type Logo = { Logo: ComponentType<SVGProps<SVGSVGElement>>; color: string };
const LOGOS: Logo[] = [
  { Logo: OpenAILogo, color: "#000000" },
  { Logo: ClaudeLogo, color: "#D97757" },
  { Logo: GeminiLogo, color: "#8E75B2" },
  { Logo: PerplexityLogo, color: "#1FB8CD" },
  { Logo: MetaLogo, color: "#0467DF" },
  { Logo: AnthropicLogo, color: "#191919" },
  { Logo: HuggingFaceLogo, color: "#E8B500" },
  { Logo: OllamaLogo, color: "#000000" },
  { Logo: CopilotLogo, color: "#000000" },
  { Logo: XLogo, color: "#000000" },
];
// 18 points spread evenly over the sphere (Fibonacci), cycling the logos.
// The sphere is wider than tall to use the panel; it explodes out of the
// centre (EXPLODE_MS, each logo a little after the last), then turns.
const POINTS = 18;
const RADIUS = 128;
const STRETCH = 1.55;
const TILT = (-14 * Math.PI) / 180;
const TURN_MS = 24000;
const SPHERE_AT = 900;
const EXPLODE_MS = 900;
const STAGGER_MS = 30;
const CHIP = 36;
const sphere = Array.from({ length: POINTS }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / POINTS;
  const r = Math.sqrt(1 - y * y);
  const lon = i * Math.PI * (3 - Math.sqrt(5));
  return { y, r, lon, logo: LOGOS[i % LOGOS.length] };
});

// Where a point sits on screen at a turn: x, y from the centre, its depth
// (0 at the back, 1 at the front)
const place = (p: (typeof sphere)[number], turn: number) => {
  const x = p.r * Math.sin(p.lon + turn);
  const z = p.r * Math.cos(p.lon + turn);
  const y = p.y * Math.cos(TILT) - z * Math.sin(TILT);
  const zt = p.y * Math.sin(TILT) + z * Math.cos(TILT);
  return { x: x * RADIUS * STRETCH, y: y * RADIUS, depth: (zt + 1) / 2 };
};

export function ThinkTogether() {
  const items = useRef<(HTMLSpanElement | null)[]>([]);

  // Explode the sphere out of the centre, then turn it: each logo's
  // position, size, fade, blur and layer (in front of the row when it's on
  // the near side) by its depth
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    // Fast out, settling: a burst
    const burst = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
    const draw = (now: number) => {
      const elapsed = now - start;
      const turn = reduced ? 0 : ((elapsed - SPHERE_AT) / TURN_MS) * Math.PI * 2;
      sphere.forEach((p, i) => {
        const el = items.current[i];
        if (!el) return;
        const { x, y, depth } = place(p, Math.max(turn, 0));
        const out = reduced ? 1 : burst((elapsed - SPHERE_AT - i * STAGGER_MS) / EXPLODE_MS);
        const scale = (0.5 + depth * 0.8) * (0.3 + out * 0.7);
        el.style.transform = `translate(${x * out}px, ${y * out}px) scale(${scale})`;
        el.style.opacity = String((0.3 + depth * 0.7) * Math.min(out * 2, 1));
        el.style.filter = depth < 0.45 ? `blur(${((0.45 - depth) * 4).toFixed(2)}px)` : "none";
        el.style.zIndex = depth > 0.55 ? "20" : "0";
      });
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="think-together absolute inset-0 flex items-center justify-center" aria-hidden>
      {/* The sphere of AI models: near ones pass in front of the row */}
      <div className="absolute top-1/2 left-1/2">
        {sphere.map((p, i) => (
          <span
            key={i}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="tt-logo absolute flex items-center justify-center rounded-full bg-white opacity-0 shadow-node"
            style={{ width: CHIP, height: CHIP, left: -CHIP / 2, top: -CHIP / 2 }}
          >
            <p.logo.Logo className="size-[18px]" style={{ color: p.logo.color }} />
          </span>
        ))}
      </div>

      <div className="relative z-10 flex items-center -space-x-2">
        {TEAM.map((p, i) => (
          <Image
            key={p.name}
            src={p.avatar}
            alt=""
            width={SIZES[i]}
            height={SIZES[i]}
            className="tt-pop rounded-full ring-2 ring-(--tt-ring)"
            style={{ ["--tt-ring" as string]: p.ring, animationDelay: `${200 + i * 120}ms` }}
          />
        ))}
        {/* Invite someone: a + in a dashed circle */}
        <span
          className="tt-pop relative flex items-center justify-center rounded-full bg-white"
          style={{ width: INVITE, height: INVITE, animationDelay: `${200 + TEAM.length * 120}ms` }}
        >
          <svg viewBox={`0 0 ${INVITE} ${INVITE}`} className="absolute inset-0 size-full" fill="none">
            <circle
              cx={INVITE / 2}
              cy={INVITE / 2}
              r={INVITE / 2 - 1}
              stroke="oklch(0.78 0 0)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>
          <Plus className="size-4 text-[oklch(0.6_0_0)]" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
