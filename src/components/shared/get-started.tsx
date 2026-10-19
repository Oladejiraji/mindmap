"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { SendIcon } from "@/components/icons/send-icon";
import { cn } from "@/lib/utils";

/*
 * Get started, modelled on usequality.app's: a title bar, a welcome with
 * the account avatar, and three cards that teach the core loop. Each card
 * has a small illustration built from the app's own UI (not screenshots)
 * on a soft painted backdrop, then a bold lead-in and a muted sentence.
 */

export function GetStarted() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? "";
  const firstName = name.split(" ")[0] || "there";

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border-default px-6">
        <h1 className="text-body-sm font-medium text-fg-primary">Get started</h1>
      </header>

      <div className="mx-auto w-full max-w-[1000px] px-6 pt-14 pb-16">
        <span
          aria-hidden
          className="block size-10 rounded-full"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.12 245), var(--brand-solid) 70%)" }}
        />
        <h2 className="font-display mt-5 text-heading-5 font-medium text-fg-primary">
          Welcome, {firstName}
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Card
            href={routes.newProject}
            backdrop="radial-gradient(120% 90% at 20% 10%, oklch(0.86 0.05 200), transparent 60%), radial-gradient(100% 100% at 90% 90%, oklch(0.8 0.06 160), transparent 55%), oklch(0.9 0.03 190)"
            illustration={<ChatIllustration />}
            title="Start with a question."
            body="Open a new chat and ask anything. Your first message starts the project; no setup, no naming."
          />
          <Card
            backdrop="radial-gradient(110% 90% at 80% 10%, oklch(0.88 0.06 80), transparent 60%), radial-gradient(100% 100% at 10% 90%, oklch(0.84 0.06 40), transparent 55%), oklch(0.92 0.04 70)"
            illustration={<CanvasIllustration />}
            title="Branch the conversation."
            body="Fork any reply to try another direction. Every branch becomes a node you can trace on the canvas."
          />
          <Card
            backdrop="radial-gradient(110% 90% at 15% 15%, oklch(0.86 0.05 140), transparent 60%), radial-gradient(100% 100% at 85% 85%, oklch(0.82 0.05 250), transparent 55%), oklch(0.9 0.03 170)"
            illustration={<NotesIllustration />}
            title="Notes carry down."
            body="Write a node's notes and every branch beneath it gets them as context, so answers stay on track."
          />
        </div>
      </div>
    </div>
  );
}

function Card({
  href,
  backdrop,
  illustration,
  title,
  body,
}: {
  href?: string;
  /** CSS background for the illustration area. */
  backdrop: string;
  illustration: React.ReactNode;
  title: string;
  body: string;
}) {
  const inner = (
    <>
      <div className="relative aspect-[12/5] overflow-hidden" style={{ background: backdrop }}>
        {illustration}
      </div>
      <p className="px-5 pt-3.5 pb-4 text-body-sm/[17px] text-fg-secondary">
        <span className="font-medium text-fg-primary">{title}</span> {body}
      </p>
    </>
  );
  const shell =
    "block overflow-hidden rounded-2xl bg-surface-container shadow-border outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50";
  return href ? (
    <Link href={href} className={cn(shell, "hover:shadow-default")}>
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/* A window chrome the illustrations sit in. */
function Window({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("absolute overflow-hidden rounded-lg bg-surface-container shadow-large", className)}>
      <div className="flex h-4 items-center gap-1 border-b border-border-subtle px-2">
        <span className="size-1.5 rounded-full bg-[#FF5F57]" />
        <span className="size-1.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-1.5 rounded-full bg-[#28C840]" />
      </div>
      {children}
    </div>
  );
}

const line = "h-1.5 rounded-full bg-fg-primary/10";

function ChatIllustration() {
  return (
    <Window className="inset-x-[10%] top-[14%] bottom-[-10%]">
      <div className="flex h-full flex-col items-center px-4 pt-3">
        <p className="text-[9px] font-semibold text-fg-primary">What are you trying to figure out?</p>
        <div className="mt-2.5 w-full rounded-lg bg-surface-container p-2 inset-ring-[0.5px] inset-ring-border-strong">
          <p className="text-[8px] text-fg-tertiary">How should we price the team plan?</p>
          <div className="mt-1 flex justify-end">
            <span className="flex size-4 items-center justify-center rounded-full bg-inverted-solid text-on-inverted-fg">
              <SendIcon className="size-2.5" />
            </span>
          </div>
        </div>
      </div>
    </Window>
  );
}

function MiniNode({ className, label, primary }: { className?: string; label: string; primary?: boolean }) {
  return (
    <div
      className={cn(
        "absolute rounded-md px-2 py-1 text-[7px] font-medium whitespace-nowrap shadow-default",
        primary ? "bg-brand-solid text-on-brand-solid" : "bg-surface-container text-fg-primary",
        className,
      )}
    >
      {label}
    </div>
  );
}

function CanvasIllustration() {
  return (
    <Window className="inset-x-[10%] top-[14%] bottom-[-10%]">
      <div className="relative h-full">
        <svg className="absolute inset-0 size-full text-border-strong" viewBox="0 0 100 80" preserveAspectRatio="none" fill="none">
          <path d="M50 17 V20 H24 V24 M50 20 H76 V24 M24 38 V41 H14 V45 M24 41 H38 V45" stroke="currentColor" strokeWidth="0.6" />
        </svg>
        <MiniNode primary label="Pricing" className="top-[4%] left-1/2 -translate-x-1/2" />
        <MiniNode label="Per-seat" className="top-[30%] left-[24%] -translate-x-1/2" />
        <MiniNode label="Usage-based" className="top-[30%] left-[76%] -translate-x-1/2" />
        <MiniNode label="Annual" className="top-[56%] left-[14%] -translate-x-1/2" />
        <MiniNode label="Monthly" className="top-[56%] left-[38%] -translate-x-1/2" />
      </div>
    </Window>
  );
}

function NotesIllustration() {
  return (
    <>
      <Window className="top-[12%] left-[8%] h-[62%] w-[52%]">
        <div className="space-y-1.5 p-3">
          <p className="text-[8px] font-semibold text-fg-primary">Pricing · notes</p>
          <div className={cn(line, "w-full")} />
          <div className={cn(line, "w-5/6")} />
          <div className={cn(line, "w-2/3")} />
          <div className={cn(line, "w-3/4")} />
        </div>
      </Window>
      <div className="absolute top-[56%] left-[56%] h-px w-[10%] bg-fg-primary/30" />
      <Window className="top-[38%] right-[8%] h-[56%] w-[34%]">
        <div className="space-y-1.5 p-2.5">
          <span className="inline-block rounded-full bg-brand-subtle px-1.5 py-0.5 text-[6px] font-medium text-brand-fg">+ context</span>
          <div className={cn(line, "w-full")} />
          <div className={cn(line, "w-4/5")} />
          <div className={cn(line, "w-2/3")} />
        </div>
      </Window>
    </>
  );
}
