"use client";

/*
 * "Your team's research in one place": carries on from "Research with the
 * team". The blue line comes in from the left edge (where it left the last
 * slide) to a project card, "Build a group research tool", which then
 * forks into two more cards, each with someone researching it, drawn like
 * the auth canvas (photo and name, and a shimmering "is researching…").
 * Under the project card, what's been done in it: a line of work, then
 * labelled samples (companies interviewed, competitors researched) with
 * their logos. Plays once on arrival and holds; reduced motion shows the
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

// The cards, each with who's researching it. x, w: the card's left edge
// and width; mid: its vertical centre; h: its height; at: when it appears
// (ms). Branch cards were forked from the project, so they say so under
// their title with the node symbol.
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
  // The photo's ring: our blue for the project's lead, colours from the
  // complementary palette (slide 1's teammate lines) for the others
  ring: string;
  forked?: boolean;
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
};
const CHILDREN: Card[] = [
  {
    x: 300,
    w: 238,
    mid: 88,
    h: 52,
    at: 1640,
    title: "User interviews",
    name: "Deji",
    avatar: DejiAvatar,
    ring: "oklch(0.7 0.18 32)",
    forked: true,
  },
  {
    x: 300,
    w: 238,
    mid: 230,
    h: 52,
    at: 1740,
    title: "Competitor research and analysis",
    name: "Stephen",
    avatar: StephenAvatar,
    ring: "oklch(0.8 0.16 82)",
    forked: true,
  },
];
// The branches grow out of the project card's right side, 100ms apart,
// once it has appeared
const BRANCH_AT = 1100;

// Under the project card (not in it): what's been done in it, 12px/16px
// regular in a light oklch grey. A line of work, then labelled samples,
// each a label line and a row of logos (brand colour) and names.
type Sample = { name: string; Logo: ComponentType<SVGProps<SVGSVGElement>>; color: string };
type Note = { text: string; samples?: Sample[] };
const NOTES: Note[] = [
  { text: "Reviewed 12 research tools" },
  {
    text: "User interviews at big tech",
    samples: [
      { name: "Meta", Logo: MetaLogo, color: "#0467DF" },
      { name: "Netflix", Logo: NetflixLogo, color: "#E50914" },
      { name: "Google", Logo: GoogleLogo, color: "#4285F4" },
    ],
  },
  {
    text: "Competitor research",
    samples: [
      { name: "Linear", Logo: LinearLogo, color: "#5E6AD2" },
      { name: "ClickUp", Logo: ClickUpLogo, color: "#7B68EE" },
      { name: "Notion", Logo: NotionLogo, color: "#000000" },
    ],
  },
];

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
        {/* The project's two forks, growing out one after another */}
        {CHILDREN.map((c, i) => (
          <path
            key={c.title}
            d={branchPath(c)}
            pathLength={1}
            className="bo-branch"
            style={{ animationDelay: `${BRANCH_AT + i * 100}ms` }}
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
            className="corner-squircle flex flex-col justify-center gap-0.5 rounded-4xl bg-white px-3 text-body-sm text-fg-primary shadow-node"
            style={{ height: b.h }}
          >
            <span className="truncate">{b.title}</span>
            {b.forked && (
              <span className={`flex items-center gap-1 ${noteText}`}>
                <BranchIcon pathClassName="fill-[oklch(0.68_0_0)]" />
                Forked
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Under the project card: its work, and labelled samples with logos */}
      <ul
        className="absolute space-y-1 px-3"
        style={{ left: PARENT.x, top: PARENT.mid + PARENT.h / 2 + 8, width: 240 }}
      >
        {NOTES.map((n, i) => (
          <li
            key={n.text}
            className={`bo-note ${noteText}`}
            style={{ animationDelay: `${PARENT.at + 260 + i * 120}ms` }}
          >
            {n.text}
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
    </div>
  );
}
