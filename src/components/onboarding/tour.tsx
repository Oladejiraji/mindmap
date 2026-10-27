"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Plus } from "lucide-react";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { CheckIcon } from "@/components/icons/check-icon";
import { MODELS } from "@/components/auth-canvas/models-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { BranchStreak } from "./branch-streak";
import "./tour.css";

/*
 * Onboarding walkthrough: one slide per thing worth knowing before you
 * start, each a live preview with a title and a line on how it works.
 * Features that aren't in the app yet say so ("Coming soon") instead of
 * promising them.
 */
// art: what the panel shows now; preview: the earlier previews, kept
export type TourSlide = { id: string; title: string; body: string; soon?: string; art?: ReactNode; preview: ReactNode };

export const TOUR: TourSlide[] = [
  {
    id: "how",
    title: "Research with the team",
    body: "Start a project with a question. Each answer can branch into its own node, so you can follow every direction without losing the thread.",
    art: <BranchStreak />,
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

/* A slide's illustration: a 578 × 318 oklch(0.975 0 0) panel beside the slide's
 * text, showing the slide's art (empty until a slide has some). The earlier
 * previews (the blue panel with the Ask then Branch chat, and the others
 * below) are kept but not shown; restore the blue panel from e7ee4a3. */
export function TourPanel({ slide }: { slide: TourSlide }) {
  return (
    <div
      aria-hidden
      className="corner-squircle relative h-full max-h-[318px] w-[578px] max-w-full shrink-0 overflow-hidden rounded-[16px] bg-[oklch(0.975_0_0)]"
    >
      {slide.art}
    </div>
  );
}

/* The Mindmap logo tile, 32px with 10px corners and a 10px m, sitting
 * 16px above a step's title. */
export function TourLogo({ className }: { className?: string }) {
  return (
    <span className={cn("mb-4 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-solid text-on-brand-solid", className)}>
      <LogoIcon className="h-auto w-2.5" />
    </span>
  );
}

/* A slide's logo, title and a line on how it works, left-aligned, beside the panel.
 * Title 500 24px/133% −0.01em #111; body 400 13px/18px #111 at 60%. */
export function TourText({ slide }: { slide: TourSlide }) {
  return (
    <div>
      <TourLogo />
      <div className="flex items-center gap-2">
        <h2 className="text-[24px] leading-[1.33] font-medium tracking-[-0.01em] text-[#111]">{slide.title}</h2>
        {slide.soon && (
          // Antalik's shimmer sweeps the label (tour.css)
          <span className="inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-caption-base inset-ring-[0.5px] inset-ring-border-default">
            <span className="t-shimmer" data-text={slide.soon}>
              {slide.soon}
            </span>
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[460px] text-[13px] leading-[18px] font-normal tracking-normal text-pretty text-[rgba(17,17,17,0.6)]">{slide.body}</p>
    </div>
  );
}

/* ---------- Previews ---------- */

const card = "corner-squircle rounded-2xl bg-surface-container shadow-default";

/* "Ask then Branch" (Figma): a simulated chat, 40px from the top of the
 * panel. Your message pills (#027fff, full 18px radius, 12px 10px padding)
 * are sent on the right; the model thinks (the chat's orb), then its reply
 * streams in line by line on the left. Two exchanges, a short hold, then
 * it fades and loops. Reduced motion shows the finished chat. */
const CHAT: { you: number; reply: string[] }[] = [
  { you: 311, reply: ["92%", "84%", "56%"] },
  { you: 277, reply: ["88%", "48%"] },
];
// Each exchange: send, think, then stream the reply lines
const STEP_MS = { send: 500, think: 900, line: 260 };

function MessageBars() {
  const steps = CHAT.reduce((n, c) => n + 2 + c.reply.length, 0);
  // Reduced motion: show the finished chat, no timeline
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [step, setPhase] = useState(0);
  const [run, setRun] = useState(0);
  const phase = reduced ? steps : step;

  useEffect(() => {
    if (reduced) return;
    // Build the timeline: per exchange, sent → thinking → each reply line
    const at: number[] = [];
    let t = 300;
    for (const c of CHAT) {
      at.push(t);
      t += STEP_MS.send;
      at.push(t);
      t += STEP_MS.think;
      for (let i = 0; i < c.reply.length; i++) {
        at.push(t);
        t += STEP_MS.line;
      }
      t += 500;
    }
    const timers = at.map((ms, i) => setTimeout(() => setPhase(i + 1), ms));
    timers.push(setTimeout(() => setPhase(-1), t + 1800)); // fade out
    timers.push(setTimeout(() => { setPhase(0); setRun((r) => r + 1); }, t + 2300));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  // Where each exchange's steps start in the timeline
  const starts = CHAT.map((_, i) => CHAT.slice(0, i).reduce((n, c) => n + 2 + c.reply.length, 0));
  return (
    <div
      key={run}
      className={cn(
        "absolute inset-x-4 top-10 flex flex-col gap-3 transition-opacity duration-500 ease-out",
        phase === -1 && "opacity-0",
      )}
    >
      {CHAT.map((c, ci) => {
        const sent = starts[ci] + 1;
        const thinking = starts[ci] + 2;
        const firstLine = starts[ci] + 3;
        const shown = (n: number) => phase === -1 || phase >= n;
        const replying = shown(firstLine);
        return (
          <div key={ci} className="flex flex-col gap-3">
            <div
              style={{ width: c.you }}
              className={cn(
                "flex origin-right items-center self-end rounded-[18px] bg-[#027fff] px-2.5 py-3 transition-[opacity,translate,scale] duration-300 ease-out [corner-shape:round]",
                shown(sent) ? "opacity-100" : "translate-y-2 scale-[0.97] opacity-0",
              )}
            >
              <span className="h-3 flex-1 rounded-full bg-white/15" />
            </div>
            <div className={cn("relative w-[60%] transition-opacity duration-200", shown(thinking) ? "opacity-100" : "opacity-0")}>
              {/* Thinking, until the first line arrives */}
              <div className={cn("absolute top-0 left-0 transition-opacity duration-200", replying ? "opacity-0" : "opacity-100")}>
                <ThinkingOrb state="working" size={20} theme="dark" aria-hidden />
              </div>
              <div className="flex flex-col gap-2">
                {c.reply.map((w, li) => (
                  <span
                    key={li}
                    style={{ width: w }}
                    className={cn(
                      "h-2.5 origin-left rounded-full bg-white/35 transition-[opacity,scale] duration-300 ease-out",
                      shown(firstLine + li) ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
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
