import React, { JSX } from "react";
import { AgentCoding, Collaboration, NodeTrees } from "../icons";
import { cn } from "@/lib/utils";
import { HeroBox } from "./hero-box";
import { IntegrationHeading } from "./integration-cycle";

const heroItems = [
  {
    id: 1,
    firstText: "Agentic Coding.",
    text: "Paired with node research trees and collaboration",
    maxWidth: 216,
    icon: <AgentCoding />,
  },
  {
    id: 2,
    firstText: " Node trees.",
    text: "Mindmap allows for easily navigatable research.",
    maxWidth: 180,
    icon: <NodeTrees />,
  },
  {
    id: 3,
    firstText: "Collaboration.",
    text: "Allows for users to collaborate with",
    maxWidth: 189,
    icon: <Collaboration />,
    smallerLetterSpacing: true,
  },
];

interface IHeroItem {
  className?: string;
  firstText?: string;
  text?: string;
  maxWidth: number;
  icon: JSX.Element;
  smallerLetterSpacing?: boolean;
}

function HeroItem(props: IHeroItem) {
  const {
    className = "",
    firstText,
    text,
    maxWidth,
    icon,
    smallerLetterSpacing = false,
  } = props;
  return (
    <div
      className={cn("h-19 flex flex-col gap-2 py-1 px-2", className)}
      style={{ maxWidth: `${maxWidth}px` }}
    >
      <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      <p
        className={cn(
          "font-inter-display text-[13px] leading-5 text-[#5BB8F5]",
          smallerLetterSpacing ? "tracking-[-0.4%]" : "tracking-[-2.6%]",
        )}
      >
        <span className="text-[#D4ECFC] font-medium">{firstText}</span> {text}
      </p>
    </div>
  );
}

export function Content() {
  return (
    <div className="flex flex-col gap-9.5">
      <div className="flex items-center gap-4.25">
        <div className="flex-1 flex flex-col gap-3">
          <p className="bg-[linear-gradient(180deg,#BAE1FB_-34.11%,#5BB8F5_153.79%)] bg-clip-text text-transparent text-base leading-6 tracking-[-2.6%] font-medium font-inter-display invisible">
            Mindmap gives you the options of a variety of integrations,research
            with your team and agents.
          </p>
          <IntegrationHeading />
          {/* <span className="text-[#BAE1FB]"></span> */}
          <p className="bg-[linear-gradient(180deg,#BAE1FB_-34.11%,#5BB8F5_153.79%)] bg-clip-text text-transparent text-base leading-6 tracking-[-2.6%] font-medium font-inter-display">
            Mindmap gives you the options of a variety of integrations,research
            with your team and agents.
          </p>
        </div>
        <HeroBox />
      </div>

      <div className="flex items-center gap-5.25">
        <div className="flex-1"></div>
        <div className="w-148 flex items-center">
          {heroItems?.map((item) => {
            return (
              <HeroItem
                key={item?.id}
                icon={item?.icon}
                firstText={item?.firstText}
                text={item?.text}
                maxWidth={item?.maxWidth}
                smallerLetterSpacing={item?.smallerLetterSpacing}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
