"use client";

/*
 * "Think together": the team from the last slide, Kurosawa, Deji and
 * Stephen, as an overlapping row of photos in their ring colours, and a
 * "+" in a dashed circle to invite someone else. Each one is a step bigger
 * than the one before (28, 34, 39, then 45 for the +), like a thought
 * bubble's trail growing; they blur in one after another. Then a sphere of
 * AI model logos forms around them, each in a small white circle, and
 * turns slowly; logos on the far side shrink and fade, and the row always
 * stays in front. Reduced motion shows everything still.
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
// 18 points spread evenly over the sphere (Fibonacci), cycling the logos
const POINTS = 18;
const RADIUS = 118;
const TILT = (-14 * Math.PI) / 180;
const TURN_MS = 24000;
const SPHERE_AT = 900;
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
  return { x: x * RADIUS, y: y * RADIUS, depth: (zt + 1) / 2 };
};

export function ThinkTogether() {
  const items = useRef<(HTMLSpanElement | null)[]>([]);

  // Turn the sphere: each logo's position, size and fade by its depth
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const turn = reduced ? 0 : ((now - start) / TURN_MS) * Math.PI * 2;
      sphere.forEach((p, i) => {
        const el = items.current[i];
        if (!el) return;
        const { x, y, depth } = place(p, turn);
        el.style.transform = `translate(${x}px, ${y}px) scale(${0.6 + depth * 0.4})`;
        el.style.setProperty("--tt-depth", String(0.25 + depth * 0.75));
      });
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="think-together absolute inset-0 flex items-center justify-center" aria-hidden>
      {/* The sphere of AI models, behind the row */}
      <div className="absolute top-1/2 left-1/2">
        {sphere.map((p, i) => (
          <span
            key={i}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="tt-logo absolute -top-3.5 -left-3.5 size-7"
          >
            <span
              className="tt-pop flex size-7 items-center justify-center rounded-full bg-white shadow-node"
              style={{ animationDelay: `${SPHERE_AT + i * 50}ms` }}
            >
              <p.logo.Logo className="size-3.5" style={{ color: p.logo.color }} />
            </span>
          </span>
        ))}
      </div>

      <div className="relative flex items-center -space-x-2">
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
