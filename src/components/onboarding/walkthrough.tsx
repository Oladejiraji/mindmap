"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { ART_OUT_MS, TOUR, TourPanel, TourText, tourArt } from "./tour";

/*
 * The walkthrough after onboarding (after Pond): a dialog over the Get
 * started page, opened with ?tour=1 when onboarding finishes. Four slides:
 * Research with the team, Your team's research in one place, Think
 * together, The canvas awaits (Teams, Choose your model and Make it yours
 * are archived). "Get started" on the last, Esc or clicking outside close
 * it and drop the param, leaving you on Get started.
 */
const TOTAL = TOUR.length;

export function Walkthrough() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("tour") === "1";
  const [step, setStep] = useState(0);
  // A slide with an exit plays it (its line runs on out of the panel)
  // before the next slide comes in
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<number | undefined>(undefined);
  // Focus starts on Continue, the expected next action
  const continueRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.clearTimeout(exitTimer.current);
    setLeaving(false);
    // Back to the first slide only once the dialog has finished closing
    // (onOpenChangeComplete), or slide 1 flashes up as it fades out
  };

  const slide = TOUR[step];
  const last = step === TOTAL - 1;

  // Every control takes effect straight away, even mid-animation (the
  // animations are interruptible): going to a slide cancels any exit that's
  // still playing
  const goTo = (n: number) => {
    window.clearTimeout(exitTimer.current);
    setLeaving(false);
    setStep(Math.min(Math.max(n, 0), TOTAL - 1));
  };

  // Back during an exit cancels it (the Continue it undoes hadn't landed
  // yet), so Continue then Back always returns you where you were
  const back = () => goTo(leaving ? step : step - 1);

  const next = () => {
    if (last) return close();
    // Continue again during an exit: skip the rest of it
    if (leaving) return goTo(step + 1);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!slide?.art || reduced) return goTo(step + 1);
    // The slide's own exit (its line running out) plays first, then its
    // visuals scale and blur, then fade (ART_OUT_MS, tourArt)
    setLeaving(true);
    exitTimer.current = window.setTimeout(
      () => {
        setLeaving(false);
        setStep((s) => s + 1);
      },
      (slide.exit ?? 0) + ART_OUT_MS,
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()} onOpenChangeComplete={(o) => !o && setStep(0)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0" />
        {/* 1040 × 628, 20px corners, white. Edge per interfaces.dev: a 1px
            ring drawn with a shadow (no border), then layered shadows for
            depth (contact, mid, ambient);
            shrinks to fit smaller screens */}
        <Dialog.Popup
          initialFocus={continueRef}
          aria-label="Welcome to Mindmap"
          className="corner-squircle fixed top-1/2 left-1/2 z-50 flex h-[min(628px,calc(100svh-32px))] w-[min(1040px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[20px] bg-white p-6 md:p-10 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.06)] outline-none transition-[opacity,scale,filter] duration-200 ease-out data-ending-style:scale-[0.99] data-ending-style:opacity-0 data-ending-style:blur-[4px] data-ending-style:duration-150 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-opacity"
        >
          <div key={step} className="flex min-h-0 flex-1 flex-col">
            {/* Text and panel on one line, centred on each other */}
            <div className="flex min-h-0 flex-1 items-center gap-10">
              {/* The text moves with the visuals: in from a slight scale and
                  blur, and out (after the slide's own exit) by scaling and
                  blurring, then fading */}
              <div
                className={cn("min-w-0 flex-1", tourArt(leaving))}
                style={{ transformOrigin: "left center", ["--tour-art-delay" as string]: `${slide.exit ?? 0}ms` }}
              >
                <TourText slide={slide} />
              </div>
              <TourPanel slide={slide} leaving={leaving} />
            </div>
          </div>

          {/* Footer: step dots, then the actions */}
          <div className="mt-auto flex w-full flex-col pt-6">
            <div className="flex items-center justify-between gap-4">
              <Dots step={step} />
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button type="button" onClick={back} className={textButton}>
                    Back
                  </button>
                )}
                {/* Continue (Get started on the last slide): 32px tall, at least 93
                    wide, 500 13px; close with Esc or outside */}
                <button
                  ref={continueRef}
                  type="button"
                  onClick={next}
                  className="corner-squircle h-8 min-w-[93px] shrink-0 cursor-pointer rounded-3xl bg-[#1e1e1e] px-4 py-1.5 text-[13px] leading-[1.38] font-medium tracking-normal text-white outline-none transition-[background-color,scale] duration-200 ease-out hover:bg-[#333] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:active:scale-100"
                >
                  {last ? "Get started" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Back: 500 14px/143%, #111 at 60%; presses down to 0.97 like Continue;
// buttons use our 16px squircle button radius
const textButton =
  "corner-squircle h-9 cursor-pointer rounded-3xl px-4 py-2 text-[14px] leading-[1.43] font-medium tracking-normal text-[rgba(17,17,17,0.6)] outline-none transition-[color,scale] duration-200 ease-out hover:text-[#111] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:active:scale-100";

/* One dot per step (5.6px, 5.6px apart), the current one dark. */
function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-[5.6px]" aria-label={`Step ${step + 1} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-[5.6px] rounded-full transition-colors duration-200 ease-out",
            i === step ? "bg-fg-primary" : "bg-component-active",
          )}
        />
      ))}
    </div>
  );
}
