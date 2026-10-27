"use client";
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAtomValue } from "jotai";
import { integrationIndexAtom } from "@/lib/atoms/integration-cycle";
import {
  GithubLogo,
  JiraLogo,
  LinearLogo,
  MindmapLogo,
  SlackLogo,
} from "../icons";

const transition = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.9,
} as const;

export const INTEGRATIONS = [
  {
    id: "mindmap",
    logo: <MindmapLogo />,
    title: "This is Mindmap.",
    subtitle: "Spatial Research.",
  },
  {
    id: "linear",
    logo: <LinearLogo />,
    title: "Integrate Linear.",
    subtitle: "Agentic Coding.",
  },
  {
    id: "slack",
    logo: <SlackLogo />,
    title: "Integrate Slack.",
    subtitle: "Shared Context.",
  },
  {
    id: "jira",
    logo: <JiraLogo />,
    title: "Integrate Jira.",
    subtitle: "Tracked Work.",
  },
  {
    id: "github",
    logo: <GithubLogo />,
    title: "Integrate Github.",
    subtitle: "Living Codebase.",
  },
];

/** Slides upward. Expects a `relative overflow-hidden` parent. */
export function IntegrationLogo() {
  const index = useAtomValue(integrationIndexAtom);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={index}
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        exit={{ y: "-100%" }}
        transition={transition}
        className="absolute inset-0 flex items-center justify-center"
      >
        {INTEGRATIONS[index].logo}
      </motion.div>
    </AnimatePresence>
  );
}

/** Slides downward, against the logo, so the pair reads as one carousel. */
export function IntegrationHeading() {
  const index = useAtomValue(integrationIndexAtom);
  const { title, subtitle } = INTEGRATIONS[index];

  return (
    <div className="relative h-24 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ y: "-100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "100%" }}
          transition={transition}
          className="absolute inset-0 flex flex-col"
        >
          <h2 className="font-inter-display leading-12 text-4xl text-white tracking-[-2.6%]">
            {title}
          </h2>
          <h2 className="font-inter-display leading-12 text-4xl text-[#BAE1FB] tracking-[-2.6%]">
            {subtitle}
          </h2>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
