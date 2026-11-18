import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import type { UseCase } from "@/lib/onboarding";
import type { Starter } from "@/components/chat/chat-input";
import { DiscoveryIcon, LearningIcon, PlanningIcon, ResearchIcon } from "@/components/icons/starter-icons";

/*
 * Ways to start a project, under the /new composer. Each is the start of a
 * sentence: picking one puts it in the box for you to finish, it doesn't
 * send. They follow the use cases picked in onboarding; with none (or only
 * "Something else"), a mix.
 */

type Kind = Exclude<UseCase, "other">;

const ICONS: Record<Kind, ReactNode> = {
  research: <ResearchIcon />,
  // No custom icon for strategy yet.
  strategy: <Scale strokeWidth={2} />,
  "product-discovery": <DiscoveryIcon />,
  planning: <PlanningIcon />,
  learning: <LearningIcon />,
};

const STARTERS: Record<Kind, string[]> = {
  research: ["Help me research ", "What's known about ", "Summarize the evidence on "],
  strategy: ["Help me decide between ", "What are the risks of ", "Build a strategy for "],
  "product-discovery": ["Explore the problem of ", "Who struggles most with ", "Find the pain points in "],
  planning: ["Plan the launch of ", "Break down the work for ", "Make a roadmap for "],
  learning: ["Teach me the basics of ", "Help me understand ", "Make a study plan for "],
};

const MIX: Kind[] = ["research", "strategy", "planning", "learning"];

const COUNT = 4;

const starter = (kind: Kind, text: string): Starter => ({ text, icon: ICONS[kind] });

/** Always four starters, taking turns across the chosen use cases, topped up from the mix. */
export function startersFor(useCases: UseCase[]): Starter[] {
  const kinds = useCases.filter((u): u is Kind => u !== "other");
  const picked: Starter[] = [];
  for (let i = 0; picked.length < COUNT && i < 3; i++) {
    for (const kind of kinds) {
      if (picked.length < COUNT) picked.push(starter(kind, STARTERS[kind][i]));
    }
  }
  // One use case only gives three.
  for (const kind of MIX) {
    const text = STARTERS[kind][0];
    if (picked.length < COUNT && !picked.some((s) => s.text === text)) picked.push(starter(kind, text));
  }
  return picked;
}
