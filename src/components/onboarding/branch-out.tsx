"use client";

/*
 * "Your team's research in one place": carries on from "Research with the
 * team". The blue line comes in from the left edge (where it left the last
 * slide) to a project card, "Build a group research tool", which then
 * forks into two more cards, each with someone researching it, drawn like
 * the auth canvas (photo and name, and a shimmering "is researching…").
 * Under each card, what's been done in it: lines of work, labelled samples
 * (competitors researched, companies interviewed) with their logos, and
 * "Forked" with the node symbol on the forks. Plays once on arrival and holds; reduced motion shows the
 * finished picture. Laid out at the panel's 578 × 318 and scaled to fit.
 */
import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import Image, { type StaticImageData } from "next/image";
import AuthAssets from "@/lib/asset-export/auth";
import DejiAvatar from "../../../public/walkthrough/deji.png";
import StephenAvatar from "../../../public/walkthrough/stephen.png";
import { BranchIcon } from "@/lib/svg";
import { ClickUpLogo, GoogleLogo, LinearLogo, MetaLogo, NetflixLogo, NotionLogo } from "./tool-logos";
import "./branch-out.css";

const W = 578;
const H = 318;
const MID = H / 2;

// Under each card (not in it): what's been done in it, 12px/16px regular
// in a light oklch grey. A line of text, optionally led by the node symbol
// (a fork), or a label with a row of samples below it: logos in brand
// colour, and names.
type Sample = { name: string; Logo: ComponentType<SVGProps<SVGSVGElement>>; color: string };
type Note = { text: string; forked?: boolean; samples?: Sample[] };
const FORKED: Note = { text: "Forked", forked: true };

// The cards, each with who's researching it. x, w: the card's left edge
// and width; mid: its vertical centre; h: its height; at: when it appears
// (ms); notes: the list under it.
const CARD = { chip: 20, gap: 6 };
type Card = {
  x: number;
  w: number;
  mid: number;
  h: number;
  at: number;
  title: string;
  name: string;
  avatar: StaticImageData;
  // The photo's ring (and its connector): our blue for the project's lead;
  // a purple near the blue's lightness and chroma for Deji; a golden amber
  // for Stephen, deep enough to hold on the light panel
  ring: string;
  // A forks' pulse ends in a light tint of its ring colour
  glow?: string;
  notes?: Note[];
};
const PARENT: Card = {
  x: 40,
  w: 210,
  mid: MID,
  h: 32,
  at: 760,
  title: "Build a group research tool",
  name: "Kurosawa",
  avatar: AuthAssets.AuthAvatar1,
  ring: "var(--brand-solid)",
  notes: [
    { text: "Reviewed 12 research tools" },
    {
      text: "Competitor research",
      samples: [
        { name: "Linear", Logo: LinearLogo, color: "#5E6AD2" },
        { name: "ClickUp", Logo: ClickUpLogo, color: "#7B68EE" },
        { name: "Notion", Logo: NotionLogo, color: "#000000" },
      ],
    },
  ],
};
const CHILDREN: Card[] = [
  {
    x: 300,
    w: 238,
    mid: 72,
    h: 32,
    at: 1640,
    title: "User interviews",
    name: "Deji",
    avatar: DejiAvatar,
    ring: "oklch(0.58 0.21 300)",
    glow: "oklch(0.84 0.1 300)",
    notes: [
      FORKED,
      {
        text: "User interviews at big tech",
        samples: [
          { name: "Meta", Logo: MetaLogo, color: "#0467DF" },
          { name: "Netflix", Logo: NetflixLogo, color: "#E50914" },
          { name: "Google", Logo: GoogleLogo, color: "#4285F4" },
        ],
      },
    ],
  },
  {
    x: 300,
    w: 238,
    mid: 228,
    h: 32,
    at: 1740,
    // Forks the features of the group research tool
    title: "Core features",
    name: "Stephen",
    avatar: StephenAvatar,
    ring: "oklch(0.76 0.16 75)",
    glow: "oklch(0.9 0.1 80)",
    // The features it forks from the group research tool
    notes: [FORKED, { text: "Core features for MVP" }, { text: "Collaboration · Clarity · Tracking" }],
  },
];
// The branches grow out of the project card's right side, 100ms apart,
// once it has appeared
const BRANCH_AT = 1100;
// Then, before a fork's notes ("Forked" first), a pulse runs along its
// connector from the project to it; the notes appear as it arrives
const PULSE = { after: 100, ms: 600 };
const notesAt = (b: Card) => (b === PARENT ? b.at + 260 : b.at + PULSE.after + PULSE.ms);

// From the project card's right middle, curving to a branch card's left
// middle
const branchPath = (to: Card) => {
  const from = PARENT.x + PARENT.w;
  const bend = (to.x - from) / 2;
  return `M${from} ${MID} C${from + bend} ${MID} ${to.x - bend} ${to.mid} ${to.x} ${to.mid}`;
};

const noteText = "text-[12px] leading-4 font-normal text-[oklch(0.68_0_0)]";

export function BranchOut() {
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
      className="branch-out absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: W, height: H }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible">
        {/* The line in from the last slide, to the project card */}
        <line x1={-2} y1={MID} x2={PARENT.x} y2={MID} pathLength={1} className="bo-in" />
        {/* The pulses' gradients: our blue at the project, shading to a
            light tint of the fork's ring colour as they arrive */}
        <defs>
          {CHILDREN.map((c, i) => (
            <linearGradient
              key={c.title}
              id={`bo-pulse-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={PARENT.x + PARENT.w}
              y1={MID}
              x2={c.x}
              y2={c.mid}
            >
              <stop offset="0" stopColor="var(--brand-solid)" />
              <stop offset="1" stopColor={c.glow} />
            </linearGradient>
          ))}
        </defs>
        {/* The project's two forks, growing out one after another, each in
            the ring colour of the person it leads to */}
        {CHILDREN.map((c, i) => (
          <path
            key={c.title}
            d={branchPath(c)}
            pathLength={1}
            className="bo-branch"
            style={{ animationDelay: `${BRANCH_AT + i * 100}ms`, stroke: c.ring }}
            fill="none"
          />
        ))}
        {/* The pulse along each fork's connector, before its notes */}
        {CHILDREN.map((c, i) => (
          <path
            key={c.title}
            d={branchPath(c)}
            pathLength={1}
            className="bo-pulse"
            style={{
              animationDelay: `${c.at + PULSE.after}ms`,
              animationDuration: `${PULSE.ms}ms`,
              stroke: `url(#bo-pulse-${i})`,
              ["--bo-glow" as string]: c.ring,
            }}
            fill="none"
          />
        ))}
      </svg>

      {/* The cards, each appearing as the line or its branch arrives, with
          who's on it */}
      {[PARENT, ...CHILDREN].map((b) => (
        <div
          key={b.title}
          className="bo-card-group absolute"
          style={{
            left: b.x,
            top: b.mid - b.h / 2 - CARD.chip - CARD.gap,
            width: b.w,
            animationDelay: `${b.at}ms`,
          }}
        >
          {/* Who: just their photo, ringed in their colour, and their name */}
          <div className="mb-1.5 flex h-5 items-center gap-1.5">
            <Image
              src={b.avatar}
              alt=""
              width={16}
              height={16}
              className="rounded-full ring-[1.5px] ring-(--bo-ring) ring-offset-1 ring-offset-white"
              style={{ ["--bo-ring" as string]: b.ring }}
            />
            <span className="text-caption-base font-medium text-fg-primary">{b.name}</span>
            {/* Same type and grey as the notes, with the Antalik shimmer in
                grey (tour.css; colours in branch-out.css) */}
            <p className="t-shimmer text-[12px] leading-4 font-normal" data-text="is researching…">
              is researching…
            </p>
          </div>
          <div
            className="corner-squircle flex items-center rounded-4xl bg-white px-3 text-body-sm text-[oklch(0.22_0.012_262)] shadow-node"
            style={{ height: b.h }}
          >
            <span className="truncate">{b.title}</span>
          </div>
          {/* Under the card: what's been done in it */}
          {b.notes && (
            <ul className="mt-2 space-y-1 px-3">
              {b.notes.map((n, i) => (
                <li
                  key={n.text}
                  className={`bo-note ${noteText}`}
                  style={{ animationDelay: `${notesAt(b) + i * 120}ms` }}
                >
                  <span className="flex items-center gap-1">
                    {n.forked && <BranchIcon pathClassName="fill-[oklch(0.68_0_0)]" />}
                    {n.text}
                  </span>
                  {n.samples && (
                    <span className="mt-1 flex items-center gap-2.5">
                      {n.samples.map(({ name, Logo, color }) => (
                        <span key={name} className="flex items-center gap-1">
                          <Logo className="size-3" style={{ color }} />
                          {name}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

    </div>
  );
}
