"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { MakeItYours } from "./make-it-yours";
import { TOUR, TourPanel, TourText } from "./tour";

/*
 * The walkthrough after onboarding (after Pond): a dialog over the Get
 * started page, opened with ?tour=1 when onboarding finishes. The tour
 * slides (how it works, nodes, collaborate, teams, models), then "Make it
 * yours". Finish, Skip tour, Esc or clicking outside close it and drop the
 * param, leaving you on Get started.
 */
const TOTAL = TOUR.length + 1;

export function Walkthrough() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("tour") === "1";
  const [step, setStep] = useState(0);
  // Focus starts on Continue, the expected next action, not on Skip tour
  const continueRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setStep(0);
  };

  const slide = TOUR[step];
  const last = step === TOTAL - 1;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0" />
        {/* 1040 × 628, 20px corners, white, hairline + soft drop shadow;
            shrinks to fit smaller screens */}
        <Dialog.Popup
          initialFocus={continueRef}
          aria-label="Welcome to Mindmap"
          className="corner-squircle fixed top-1/2 left-1/2 z-50 flex h-[min(628px,calc(100svh-32px))] w-[min(1040px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[20px] bg-white p-6 md:p-10 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_0_rgba(0,0,0,0.04)] outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-[0.99] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[0.97] data-starting-style:opacity-0 motion-reduce:transition-opacity"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-2.5" />
          </span>
          <div key={step} className="flex min-h-0 flex-1 flex-col pt-1 motion-safe:motion-opacity-in-0 motion-safe:motion-translate-y-in-[6px] motion-safe:motion-duration-300 motion-safe:motion-ease-out">
            {slide ? (
              // Text and panel on one line, centred on each other
              <div className="flex min-h-0 flex-1 items-center gap-10 pt-4">
                <div className="min-w-0 flex-1">
                  <TourText slide={slide} />
                </div>
                <TourPanel />
              </div>
            ) : (
              <MakeItYours className="min-h-0 flex-1 pt-4" />
            )}
          </div>

          {/* Footer: step dots, then the actions */}
          <div className="mt-auto flex w-full flex-col pt-6">
            <div className="flex items-center justify-between gap-4">
              <Dots step={step} />
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button type="button" onClick={() => setStep(step - 1)} className={textButton}>
                    Back
                  </button>
                )}
                {/* Skip + Continue: a 166 × 36 group; Skip 61 × 36, Continue
                    93 × 36, 12px apart; text 500 14px/143% */}
                <div className="flex h-9 w-[166px] items-center justify-end gap-3">
                  {slide && (
                    <button
                      type="button"
                      onClick={close}
                      className="corner-squircle h-9 w-[61px] shrink-0 cursor-pointer rounded-3xl px-4 py-2 text-[14px] leading-[1.43] font-medium tracking-normal text-[rgba(17,17,17,0.6)] outline-none transition-colors hover:text-[#111] focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    ref={continueRef}
                    type="button"
                    onClick={() => (last ? close() : setStep(step + 1))}
                    className="corner-squircle h-9 w-[93px] shrink-0 cursor-pointer rounded-3xl bg-[#1e1e1e] px-4 py-2 text-[14px] leading-[1.43] font-medium tracking-normal text-white outline-none transition-[background-color,scale] duration-200 ease-out hover:bg-[#333] focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] motion-reduce:active:scale-100"
                  >
                    {last ? "Finish" : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Back: same text as Skip (500 14px/143%, #111 at 60%); buttons use our
// 16px squircle button radius
const textButton =
  "corner-squircle h-9 cursor-pointer rounded-3xl px-4 py-2 text-[14px] leading-[1.43] font-medium tracking-normal text-[rgba(17,17,17,0.6)] outline-none transition-colors hover:text-[#111] focus-visible:ring-3 focus-visible:ring-ring/50";

/* One dot per step, the current one wider. */
function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${step + 1} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-1 rounded-full transition-colors duration-200 ease-out",
            i === step ? "bg-fg-primary" : "bg-component-active",
          )}
        />
      ))}
    </div>
  );
}
