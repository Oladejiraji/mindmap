"use client";

/*
 * "Create nodes": carries on from "Research with the team". The blue line
 * comes in from the left edge (where it left the last slide) into a node,
 * which lights up behind a travelling blue edge; then three branches grow
 * out of it to cards, each with someone researching it, drawn like the
 * auth canvas (an author chip with avatar and name, and its shimmering
 * "is researching…"). Plays once on arrival and holds; reduced motion
 * shows the finished picture. Laid out at the panel's 578 × 318 and
 * scaled to fit.
 */
import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import AuthAssets from "@/lib/asset-export/auth";
import "./branch-out.css";

const W = 578;
const H = 318;
const MID = H / 2;
// The node the line runs into
const ROOT = { x: 120, size: 32, r: 8 };
const ROOT_RIGHT = ROOT.x + ROOT.size;
const ROOT_TOP = MID - ROOT.size / 2;
// Its outline in two halves, from where the line arrives (left middle) to
// where the branches leave (right middle)
const EDGE_TOP = `M${ROOT.x} ${MID} V${ROOT_TOP + ROOT.r} A${ROOT.r} ${ROOT.r} 0 0 1 ${ROOT.x + ROOT.r} ${ROOT_TOP} H${ROOT_RIGHT - ROOT.r} A${ROOT.r} ${ROOT.r} 0 0 1 ${ROOT_RIGHT} ${ROOT_TOP + ROOT.r} V${MID}`;
const EDGE_BOTTOM = `M${ROOT.x} ${MID} V${ROOT_TOP + ROOT.size - ROOT.r} A${ROOT.r} ${ROOT.r} 0 0 0 ${ROOT.x + ROOT.r} ${ROOT_TOP + ROOT.size} H${ROOT_RIGHT - ROOT.r} A${ROOT.r} ${ROOT.r} 0 0 0 ${ROOT_RIGHT} ${ROOT_TOP + ROOT.size - ROOT.r} V${MID}`;

// The branched nodes: a card each, with who's researching it (the auth
// canvas's people). mid: the card's vertical centre.
const CARD = { x: 300, w: 230, h: 44, chip: 20, gap: 6 };
const BRANCHES: { mid: number; title: string; name: string; avatar: StaticImageData; bg: string }[] = [
  { mid: 64, title: "Pricing models", name: "Lex Porto", avatar: AuthAssets.AuthAvatar1, bg: "#2D2D2D" },
  { mid: MID, title: "User interviews", name: "Oladeji Raji", avatar: AuthAssets.AuthAvatar2, bg: "#2D2D2D" },
  { mid: 254, title: "Competitor teardown", name: "Felipe Rocha", avatar: AuthAssets.AuthAvatar3, bg: "#3476FB" },
];

// Out of the node's right side, curving to the card's left middle
const branchPath = (mid: number) =>
  `M${ROOT_RIGHT} ${MID} C${ROOT_RIGHT + 68} ${MID} ${CARD.x - 68} ${mid} ${CARD.x} ${mid}`;

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
        {/* The line in from the last slide, into the node */}
        <line x1={-2} y1={MID} x2={ROOT.x} y2={MID} pathLength={1} className="bo-in" />
        {/* The branches, growing out one after another */}
        {BRANCHES.map((b, i) => (
          <path
            key={b.title}
            d={branchPath(b.mid)}
            pathLength={1}
            className="bo-branch"
            style={{ animationDelay: `${1380 + i * 100}ms` }}
            fill="none"
          />
        ))}
        {/* The node: faint until the line reaches it, then a blue edge
            travels round it and it lights up behind it */}
        <rect className="bo-root" x={ROOT.x} y={ROOT_TOP} width={ROOT.size} height={ROOT.size} rx={ROOT.r} />
        <rect className="bo-root-lit" x={ROOT.x} y={ROOT_TOP} width={ROOT.size} height={ROOT.size} rx={ROOT.r} />
        <path className="bo-edge" d={EDGE_TOP} pathLength={1} fill="none" />
        <path className="bo-edge" d={EDGE_BOTTOM} pathLength={1} fill="none" />
      </svg>

      {/* The cards, each appearing as its branch arrives, with who's on it */}
      {BRANCHES.map((b, i) => (
        <div
          key={b.title}
          className="bo-card-group absolute"
          style={{
            left: CARD.x,
            top: b.mid - CARD.h / 2 - CARD.chip - CARD.gap,
            width: CARD.w,
            animationDelay: `${1920 + i * 100}ms`,
          }}
        >
          <div className="mb-1.5 flex h-5 items-center gap-1">
            <div
              className="flex items-center gap-1 rounded-md border border-black/2 px-1.5 py-0.5 shadow-default"
              style={{ backgroundColor: b.bg }}
            >
              <Image
                src={b.avatar}
                alt=""
                width={16}
                height={16}
                className="rounded-full outline-1 -outline-offset-1 outline-black/8"
              />
              <span className="text-caption-base text-background">{b.name}</span>
            </div>
            <p className="gradient-text-shimmer text-caption-base opacity-50">is researching…</p>
          </div>
          <div className="corner-squircle flex h-11 items-center rounded-2xl bg-white px-3.5 text-body-sm text-fg-primary shadow-node">
            {b.title}
          </div>
        </div>
      ))}
    </div>
  );
}
