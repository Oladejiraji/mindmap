/*
 * "Think together": the team from the last slide, Kurosawa, Deji and
 * Stephen, as an overlapping row of photos in their ring colours, and a
 * "+" in a dashed circle to invite someone else. Each one is a step bigger
 * than the one before (40, 48, 56, then 64 for the +), like a thought
 * bubble's trail growing. They pop in one after
 * another as the slide arrives and hold; reduced motion shows them
 * straight away.
 */
import Image, { type StaticImageData } from "next/image";
import { Plus } from "lucide-react";
import DejiAvatar from "../../../public/walkthrough/deji.png";
import KurosawaAvatar from "../../../public/walkthrough/kurosawa.png";
import StephenAvatar from "../../../public/walkthrough/stephen.png";
import "./think-together.css";

// Same people and ring colours as "Your team's research in one place"
const TEAM: { name: string; avatar: StaticImageData; ring: string }[] = [
  { name: "Kurosawa", avatar: KurosawaAvatar, ring: "var(--brand-solid)" },
  { name: "Deji", avatar: DejiAvatar, ring: "oklch(0.58 0.21 300)" },
  { name: "Stephen", avatar: StephenAvatar, ring: "oklch(0.76 0.16 75)" },
];
// Sizes grow by 8px a step along the row; the + is the next step
const SIZES = [40, 48, 56];
const INVITE = 64;

export function ThinkTogether() {
  return (
    <div className="think-together absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="flex items-center -space-x-2.5">
        {TEAM.map((p, i) => (
          <Image
            key={p.name}
            src={p.avatar}
            alt=""
            width={SIZES[i]}
            height={SIZES[i]}
            className="tt-pop rounded-full ring-2 ring-(--tt-ring) ring-offset-2 ring-offset-white"
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
          <Plus className="size-5 text-[oklch(0.6_0_0)]" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
