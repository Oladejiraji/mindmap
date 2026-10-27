"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { Switch } from "@/components/ui/switch";
import { useAnimatedReplies, useCanvasHints, useHomeLayout, type HomeLayout } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { TourLogo } from "./tour";

/*
 * Onboarding step 2, after Pond's "Make it yours": a walkthrough of the
 * features you can tune, each a card with a small live preview of what
 * it does, one line on how to use it, and its real setting. Intro in the
 * middle; everything here can be changed later in Settings › Preferences.
 *
 *   ┌──────────────┬──────────────┬──────────────┐
 *   │ Shortcut     │              │ Animated     │
 *   │ hints        │  Make it     │ replies      │
 *   ├──────────────┤  yours       │              │
 *   │ Home layout  │              │              │
 *   └──────────────┴──────────────┴──────────────┘
 */
export function MakeItYours({ className }: { className?: string }) {
  const [hints, setHints] = useCanvasHints();
  const [animated, setAnimated] = useAnimatedReplies();
  const [layout, setLayout] = useHomeLayout();

  return (
    <div className={cn("grid gap-3 md:grid-cols-3 md:grid-rows-2", className)}>
      <Card
        title="Shortcut hints"
        hint="Press Tab on a node to branch it, ↵ to add a sibling."
        control={<Switch checked={hints} onCheckedChange={setHints} aria-label="Shortcut hints" />}
      >
        <HintsPreview on={hints} />
      </Card>

      <div className="flex flex-col items-center justify-center px-6 py-10 text-center md:row-span-2">
        <TourLogo />
        <h2 className="font-display text-heading-4 text-fg-primary">Make it yours</h2>
        <p className="mt-3 max-w-72 text-body-base text-fg-secondary">
          A quick tour of how Mindmap works for you. Change any of it later in Settings.
        </p>
      </div>

      <Card
        className="md:row-span-2"
        title="Animated replies"
        hint="Replies fade in word by word as the AI writes them."
        control={<Switch checked={animated} onCheckedChange={setAnimated} aria-label="Animated replies" />}
      >
        <ReplyPreview animated={animated} />
      </Card>

      <Card
        title="Home layout"
        hint="See your projects as cards or as a list."
        control={<LayoutPicker value={layout} onChange={setLayout} />}
      >
        <LayoutPreview layout={layout} />
      </Card>
    </div>
  );
}

function Card({
  title,
  hint,
  control,
  className,
  children,
}: {
  title: string;
  hint: string;
  control: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("corner-squircle flex min-h-0 flex-col rounded-3xl bg-background p-4 shadow-border", className)}
    >
      <div aria-hidden className="flex min-h-0 flex-1 items-center justify-center">
        {children}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg-primary">{title}</p>
          <p className="mt-0.5 text-caption-lg text-fg-tertiary">{hint}</p>
        </div>
        {control}
      </div>
    </section>
  );
}

/* The canvas hint pill, dimmed when the setting is off. */
function HintsPreview({ on }: { on: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full bg-surface-container px-3 py-1.5 text-caption-lg text-fg-secondary shadow-default transition-opacity duration-200",
        !on && "opacity-30",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Kbd>Tab</Kbd> Branch
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>↵</Kbd> Sibling
      </span>
    </div>
  );
}

const SAMPLE = "Two credible directions: per-seat pricing is predictable, usage-based scales with value.";

/* A sample reply that replays every few seconds: word by word when on,
 * all at once when off. */
function ReplyPreview({ animated }: { animated: boolean }) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRun((r) => r + 1), 4200);
    return () => clearInterval(id);
  }, []);
  const words = SAMPLE.split(" ");
  return (
    <div className="flex w-full max-w-64 flex-col gap-3">
      <p className="self-end rounded-[20px] bg-component px-3.5 py-2 text-body-sm text-fg-primary [corner-shape:round]">
        How should we price it?
      </p>
      <p key={run} className="text-body-sm text-fg-primary">
        {words.map((w, i) => (
          <span
            key={i}
            className={animated ? "animate-word-in motion-reduce:animate-none" : undefined}
            style={animated ? { animationDelay: `${i * 70}ms` } : undefined}
          >
            {w}{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

function LayoutPicker({ value, onChange }: { value: HomeLayout; onChange: (v: HomeLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Home layout" className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg bg-component p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-full cursor-pointer rounded-md px-2.5 text-caption-lg capitalize outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            value === v ? "bg-surface-container text-fg-primary shadow-default" : "text-fg-secondary hover:text-fg-primary",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/* Projects as cards or rows, in the brand-blue project tile. */
function LayoutPreview({ layout }: { layout: HomeLayout }) {
  const tile = { background: "linear-gradient(135deg, oklch(0.78 0.12 245), var(--brand-solid) 70%)" };
  const bar = "rounded-sm bg-component-active";
  return layout === "grid" ? (
    <div className="grid w-full max-w-56 grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="corner-squircle aspect-4/3 rounded-lg bg-component" />
          <div className={cn(bar, "mt-1.5 h-1.5 w-3/4")} />
        </div>
      ))}
    </div>
  ) : (
    <div className="flex w-full max-w-56 flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="size-3.5 shrink-0 rounded" style={tile} />
          <div className={cn(bar, "h-1.5", ["w-2/5", "w-1/4", "w-1/3"][i])} />
          <div className={cn(bar, "ml-auto h-1.5 w-6 opacity-60")} />
        </div>
      ))}
    </div>
  );
}
