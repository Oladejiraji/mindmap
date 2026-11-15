"use client";
import React, { useState } from "react";
import Image from "next/image";
import { MenuGroup } from "./menu-group";
import type { NavState } from "./nav-area";
import {
  MenuIllustration,
  type ConnectLogo,
  type IllustrationId,
} from "./illustrations";
import { RenderIf } from "@/components/shared/render-if";

interface IPromo {
  title: string;
  body: string;
  /** Under `public/`. */
  image: string;
}

export interface IMenuData {
  id: number;
  title: string;
  description: string;
  /** The scene shown in the promo slot while this row is hovered. */
  illustration?: IllustrationId;
  /** For the Connect scene: the integration's logo. */
  logo?: ConnectLogo;
  /** For rows without a scene: the card shown in the promo slot instead. */
  promo?: IPromo;
}

const productData: IMenuData[] = [
  {
    id: 1,
    title: "Canvas",
    description: "Think in space, not docs",
    illustration: "canvas",
  },
  {
    id: 2,
    title: "Branches",
    description: "Fork any idea, keep the why",
    illustration: "branches",
  },
  {
    id: 3,
    title: "Blocks",
    description: "The artifact, not the transcript",
    illustration: "blocks",
  },
  {
    id: 4,
    title: "Node Chat",
    description: "AI that knows the whole tree",
    illustration: "nodeChat",
  },
  {
    id: 5,
    title: "Agents",
    description: "Hand a branch off to build",
    illustration: "agents",
  },
];

const connectData: IMenuData[] = [
  {
    id: 1,
    title: "GitHub",
    description: "Specs that ship as PRs",
    illustration: "connect",
    logo: "github",
  },
  {
    id: 2,
    title: "Linear",
    description: "Branches become issues",
    illustration: "connect",
    logo: "linear",
  },
  {
    id: 3,
    title: "Slack",
    description: "Pull threads into the tree",
    illustration: "connect",
    logo: "slack",
  },
  {
    id: 4,
    title: "Jira",
    description: "Keep work tied to reasoning",
    illustration: "connect",
    logo: "jira",
  },
  {
    id: 5,
    title: "MCP",
    description: "Your tree, inside every agent",
    illustration: "connect",
    logo: "mcp",
  },
];

const solutionsData: IMenuData[] = [
  {
    id: 1,
    title: "Product",
    description: "Discovery to spec in one tree",
    promo: {
      title: "Explore wide, ship one spec",
      body: "Branch every option and keep why the rest lost",
      image: "/landing/solutions-product.webp",
    },
  },
  {
    id: 2,
    title: "Engineering",
    description: "Context agents can actually use",
    promo: {
      title: "Hand agents the whole story",
      body: "Every branch carries the reasoning behind it",
      image: "/landing/solutions-engineering.webp",
    },
  },
  {
    id: 3,
    title: "Design",
    description: "Every decision, with its reasoning",
    promo: {
      title: "Critique that doesn't get lost",
      body: "Feedback and pivots stay attached to the work",
      image: "/landing/solutions-design.webp",
    },
  },
  {
    id: 4,
    title: "Research",
    description: "Synthesis that stays connected",
    promo: {
      title: "Trace every insight to its source",
      body: "Findings stay linked to the threads they came from",
      image: "/landing/solutions-research.webp",
    },
  },
  {
    id: 5,
    title: "Leadership",
    description: "See how the team is thinking",
    promo: {
      title: "See the thinking, not just output",
      body: "Follow how each decision was reached",
      image: "/landing/solutions-leadership.webp",
    },
  },
];

/** Every team's image, in row order. */
const solutionImages = solutionsData.flatMap(({ title, promo }) =>
  promo ? [{ src: promo.image, alt: title, promo }] : [],
);

interface IProps {
  state: NavState;
}

export function MenuContent(props: IProps) {
  const { state } = props;

  const stateKey = state || "product";

  /**
   * The last row with a scene or promo that was hovered. It sticks when the
   * pointer leaves, so crossing the gap between rows doesn't flash back to
   * the default.
   */
  const [hovered, setHovered] = useState<IMenuData | null>(null);

  const primaryData = stateKey === "solutions" ? solutionsData : productData;
  const visibleRows =
    stateKey === "product" ? [...primaryData, ...connectData] : primaryData;
  const withSlot = visibleRows.filter((item) => item.illustration || item.promo);
  // Only a row from the visible menu counts; otherwise fall back to its first.
  const active =
    hovered && withSlot.includes(hovered) ? hovered : (withSlot[0] ?? null);

  const onItemHover = (item: IMenuData) => {
    if (item.illustration || item.promo) setHovered(item);
  };

  return (
    <div className="relative h-77.5 overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_0.5px_#093BDC1f,0_8px_40px_0_#093BDC40,0_12px_32px_-16px_#093BDC66] flex gap-0">
      <MenuGroup
        title={stateKey === "solutions" ? "BY TEAM" : "PRODUCT"}
        data={primaryData}
        onItemHover={onItemHover}
      />

      <MenuGroup
        title="CONNECT"
        data={connectData}
        isVisible={stateKey === "product"}
        onItemHover={onItemHover}
      />

      <div className="w-60 h-full py-3 mr-3">
        <RenderIf condition={active?.illustration !== undefined}>
          {active?.illustration && (
            <MenuIllustration id={active.illustration} logo={active.logo} />
          )}
        </RenderIf>
        <RenderIf condition={active?.promo !== undefined}>
          {/* Fixed to the slot's size, so the copy over it never shifts the layout. Every team's
              image stays mounted and loaded, so hovering swaps instantly instead of flashing empty. */}
          <div className="relative w-60 h-71.5 overflow-hidden rounded-[8px] bg-[#F1F1F1] flex flex-col justify-end gap-1 p-4">
            {solutionImages.map((image) => (
              <Image
                key={image.src}
                src={image.src}
                alt={image.alt}
                fill
                sizes="240px"
                loading="eager"
                // Shows zoomed in a touch and settles out. Hidden ones sit zoomed, ready for next time.
                className={`object-cover transition-transform duration-1000 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
                  image.promo === active?.promo ? "opacity-100 scale-100" : "opacity-0 scale-108"
                }`}
              />
            ))}
            {/* A light fade under the copy, so it reads on any image. */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/50 to-transparent" />
            <p className="relative text-white text-13 leading-4 tracking-[-0.56%] font-inter-display">
              {active?.promo?.title}
            </p>
            <p className="relative text-white/80 text-11 leading-3 tracking-[-0.56%] font-inter-display text-pretty">
              {active?.promo?.body}
            </p>
          </div>
        </RenderIf>
      </div>
    </div>
  );
}
