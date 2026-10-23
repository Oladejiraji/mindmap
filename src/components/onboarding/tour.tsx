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
    title: "Ask then Branch",
    body: "Start a project with a question. Each answer can branch into its own node, so you can follow every direction without losing the thread.",
    preview: <MessageBars />,
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

/* A slide's illustration: the 770 × 318 brand-blue panel, right-aligned
 * under the logo. */
export function TourPanel({ slide }: { slide: TourSlide }) {
  return (
    <div
      aria-hidden
      style={{ background: "linear-gradient(180deg, #0c6bf9 -8.02%, #0c67ef 58.41%, #073f93 257.7%)" }}
      className="corner-squircle relative ml-auto flex h-[318px] w-[770px] max-w-full items-center justify-center overflow-hidden rounded-[16px] shadow-[0_0_0_1px_rgba(5,85,204,0.4)]"
    >
      {slide.preview}
    </div>
  );
}

/* A slide's title and a line on how it works, left-aligned.
 * Title 600 24px/133% −0.01em #111; body 500 14px/143% #111 at 60%. */
export function TourText({ slide }: { slide: TourSlide }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-[24px] leading-[1.33] font-semibold tracking-[-0.01em] text-[#111]">{slide.title}</h2>
        {slide.soon && (
          <span className="rounded-md px-1.5 text-caption-base text-fg-tertiary inset-ring-[0.5px] inset-ring-border-default">
            {slide.soon}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[460px] text-[14px] leading-[1.43] font-medium tracking-normal text-pretty text-[rgba(17,17,17,0.6)]">{slide.body}</p>
    </div>
  );
}

/* ---------- Previews ---------- */

const card = "corner-squircle rounded-2xl bg-surface-container shadow-default";
const bar = "rounded-sm bg-component-active";

/* "Ask then Branch" (Figma): three message bars stacked bottom-right of
 * the panel, right-aligned, 10px apart. Each bar hugs to 36px high, 13px
 * radius, 12px 10px padding, #027fff, with a lighter line for its text. */
function MessageBars() {
  return (
    <div className="absolute right-4 bottom-12 flex flex-col items-end gap-2.5">
      {[308, 277, 404].map((w) => (
        <div key={w} style={{ width: w }} className="flex items-center rounded-[13px] bg-[#027fff] px-2.5 py-3">
          <span className="h-3 flex-1 rounded-full bg-white/15" />
        </div>
      ))}
    </div>
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
