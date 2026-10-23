"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { CheckIcon } from "@/components/icons/check-icon";
import { MODELS } from "@/components/auth-canvas/models-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

/*
 * Onboarding walkthrough: one slide per thing worth knowing before you
 * start, each a live preview with a title and a line on how it works.
 * Features that aren't in the app yet say so ("Coming soon") instead of
 * promising them.
 */
export type TourSlide = { id: string; title: string; body: string; soon?: string; preview: ReactNode };

export const TOUR: TourSlide[] = [
  {
    id: "how",
    title: "Ask, then branch",
    body: "Start a project with a question. Each answer can branch into its own node, so you can follow every direction without losing the thread.",
    preview: <HowItWorks />,
  },
  {
    id: "nodes",
    title: "Create nodes",
    body: "Select a node and press Tab to branch it, or ↵ to add a sibling beside it. You can also drag from a node's handle and drop the branch where you want it.",
    preview: <CreateNodes />,
  },
  {
    id: "collaborate",
    title: "Think together",
    body: "Invite your team onto a project so everyone can follow and add to the same branches.",
    soon: "Invites coming soon",
    preview: <Collaborate />,
  },
  {
    id: "teams",
    title: "Teams",
    body: "Group people in your workspace by how they work, like Product or Research. Set them up in Settings › Teams.",
    preview: <Teams />,
  },
  {
    id: "models",
    title: "Choose your model",
    body: "Pick the model that answers in each project, from ChatGPT to Claude.",
    soon: "Coming soon",
    preview: <Models />,
  },
];

/* A slide: the 770 × 318 illustration panel (brand blue) right-aligned
 * under the logo, then the title and a line on how it works, left-aligned. */
export function TourStep({ slide }: { slide: TourSlide }) {
  return (
    <div className="flex flex-col">
      <div
        aria-hidden
        style={{ background: "linear-gradient(180deg, oklch(0.6 0.2 262) 0%, oklch(0.53 0.2 264) 100%)" }}
        className="corner-squircle ml-auto flex h-[318px] w-[770px] max-w-full items-center justify-center overflow-hidden rounded-2xl"
      >
        {slide.preview}
      </div>
      <div className="mt-10 flex items-center gap-2">
        <h2 className="text-heading-6 font-semibold text-fg-primary">{slide.title}</h2>
        {slide.soon && (
          <span className="rounded-md px-1.5 text-caption-base text-fg-tertiary inset-ring-[0.5px] inset-ring-border-default">
            {slide.soon}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[460px] text-body-sm text-pretty text-fg-secondary">{slide.body}</p>
    </div>
  );
}

/* ---------- Previews ---------- */

const card = "corner-squircle rounded-2xl bg-surface-container shadow-default";
const bar = "rounded-sm bg-component-active";

/* A question, its answer, and two branches growing from it. */
function HowItWorks() {
  return (
    <div className="flex w-72 flex-col items-center">
      <p className="self-end rounded-[20px] bg-component px-3.5 py-2 text-body-sm text-fg-primary [corner-shape:round]">
        How should we price the team plan?
      </p>
      <div className={cn(card, "mt-3 w-full p-3")}>
        <div className={cn(bar, "h-1.5 w-11/12")} />
        <div className={cn(bar, "mt-1.5 h-1.5 w-3/4")} />
      </div>
      <div className="flex h-5 w-40 justify-between">
        <span className="ml-6 w-px bg-border-strong" />
        <span className="mr-6 w-px bg-border-strong" />
      </div>
      <div className="flex w-full gap-3">
        <BranchChip>Per-seat</BranchChip>
        <BranchChip>Usage-based</BranchChip>
      </div>
    </div>
  );
}

function BranchChip({ children }: { children: ReactNode }) {
  return (
    <div className={cn(card, "flex-1 px-3 py-2 text-left text-caption-lg font-medium text-fg-primary")}>{children}</div>
  );
}

/* A selected node, its new branch and sibling, with the keys that make them. */
function CreateNodes() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn(card, "w-40 px-3 py-2 text-caption-lg font-medium text-fg-primary ring-2 ring-brand-solid")}>
        Pricing research
      </div>
      <div className="flex gap-3">
        <div className={cn(card, "w-32 px-3 py-2 text-caption-lg text-fg-secondary")}>Per-seat</div>
        <div className={cn(card, "w-32 px-3 py-2 text-caption-lg text-fg-tertiary outline-1 -outline-offset-1 outline-dashed outline-border-strong shadow-none")}>
          New branch
        </div>
      </div>
      <div className="flex items-center gap-4 text-caption-lg text-fg-tertiary">
        <span className="flex items-center gap-1.5">
          <Kbd>Tab</Kbd> Branch
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> Sibling
        </span>
      </div>
    </div>
  );
}

/* The node row from the side panel: you plus teammates, and a + to invite. */
function Collaborate() {
  const people = [
    { initial: "O", bg: "oklch(0.72 0.12 30)" },
    { initial: "L", bg: "oklch(0.7 0.11 160)" },
  ];
  return (
    <div className={cn(card, "flex items-center gap-3 px-4 py-3")}>
      <span className="text-body-sm font-medium text-fg-primary">Pricing research</span>
      <span className="flex items-center -space-x-1.5">
        <span className="relative flex size-7 overflow-hidden rounded-full ring-2 ring-surface-container">
          <UserAvatar size={28} />
        </span>
        {people.map((p) => (
          <span
            key={p.initial}
            style={{ background: p.bg }}
            className="relative flex size-7 items-center justify-center rounded-full text-caption-lg font-medium text-white ring-2 ring-surface-container"
          >
            {p.initial}
          </span>
        ))}
        <span className="relative flex size-7 items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-container text-fg-tertiary ring-2 ring-surface-container">
          <Plus className="size-3.5" />
        </span>
      </span>
    </div>
  );
}

/* The Settings › Teams list. */
function Teams() {
  const teams = [
    { name: "Product", initial: "P", bg: "var(--brand-solid)" },
    { name: "User Research", initial: "U", bg: "oklch(0.6 0.2 295)" },
  ];
  return (
    <div className={cn(card, "w-72 divide-y divide-border-default/[0.28]")}>
      {teams.map((t) => (
        <div key={t.name} className="flex items-center gap-3 px-3.5 py-2.5">
          <span
            style={{ background: t.bg }}
            className="flex size-6 items-center justify-center rounded-md text-caption-lg font-medium text-white"
          >
            {t.initial}
          </span>
          <span className="text-body-sm text-fg-primary">{t.name}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 px-3.5 py-2.5 text-body-sm text-fg-tertiary">
        <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-border-strong">
          <Plus className="size-3.5" />
        </span>
        New team
      </div>
    </div>
  );
}

/* The model picker, one model chosen. */
function Models() {
  return (
    <div className={cn(card, "w-72 p-1.5")}>
      {MODELS.slice(0, 3).map((m, i) => (
        <div
          key={m.id}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-[14px] px-2.5 text-body-sm font-medium text-fg-primary",
            i === 1 && "bg-transparent-hover",
          )}
        >
          <span className="flex size-4 items-center justify-center">{m.icon}</span>
          <span className="flex-1 text-left">{m.name}</span>
          <span className="text-caption-lg font-normal text-fg-tertiary">{m.provider}</span>
          {i === 1 && <CheckIcon className="size-4 text-fg-secondary" />}
        </div>
      ))}
    </div>
  );
}
