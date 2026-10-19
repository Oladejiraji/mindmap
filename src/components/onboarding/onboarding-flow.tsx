"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { ROLES, TEAM_SIZES, USE_CASES, useOnboarding, type UseCase } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/*
 * B2B onboarding, shown once after sign-up. Three short steps:
 *   1  Organization  name + team size (the workspace)
 *   2  Role          what you do
 *   3  Use case      what you'll use Mindmap for (multi-select)
 * Answers save as you go (lib/onboarding.ts); finishing lands on Get
 * started. Org name is required; the rest can be skipped.
 */

const STEPS = ["Organization", "Role", "Use case"] as const;

const field =
  "corner-squircle h-10 w-full rounded-xl bg-surface-container px-3.5 text-body-base text-fg-primary shadow-border outline-none transition-shadow placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50";

export function OnboardingFlow() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [data, update] = useOnboarding();
  const [step, setStep] = useState(0);
  const firstName = session?.user?.name?.split(" ")[0];

  const canContinue = step === 0 ? data.orgName.trim().length > 0 : true;
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!canContinue) return;
    if (last) {
      update({ orgName: data.orgName.trim(), completedAt: Date.now() });
      router.replace(routes.getStarted);
    } else {
      setStep(step + 1);
    }
  };

  const toggleUseCase = (value: UseCase) =>
    update({ useCases: data.useCases.includes(value) ? data.useCases.filter((u) => u !== value) : [...data.useCases, value] });

  return (
    <div className="flex min-h-svh flex-col items-center bg-sidebar px-6 py-10">
      <div className="flex w-full max-w-[480px] flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-4" />
          </span>
          <ol aria-label="Progress" className="flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={i === step ? "step" : undefined}
                aria-label={`${label}${i < step ? " (done)" : ""}`}
                className={cn("h-1.5 rounded-full transition-all duration-300", i === step ? "w-6 bg-fg-primary" : i < step ? "w-1.5 bg-fg-secondary" : "w-1.5 bg-fg-disabled")}
              />
            ))}
          </ol>
        </div>

        <form
          className="mt-16 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 0 && (
            <Step
              eyebrow={firstName ? `Welcome, ${firstName}` : "Welcome"}
              title="Set up your organization"
              description="Mindmap is a shared space for your team's thinking. This becomes your workspace."
            >
              <label className="block">
                <span className="text-body-sm font-medium text-fg-primary">Organization name</span>
                <input
                  autoFocus
                  value={data.orgName}
                  onChange={(e) => update({ orgName: e.target.value })}
                  placeholder="Acme Inc."
                  className={cn(field, "mt-2")}
                />
              </label>
              <fieldset className="mt-6">
                <legend className="text-body-sm font-medium text-fg-primary">Team size</legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {TEAM_SIZES.map((t) => (
                    <Choice key={t.value} selected={data.teamSize === t.value} onSelect={() => update({ teamSize: t.value })} role="radio">
                      {t.label}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            </Step>
          )}

          {step === 1 && (
            <Step eyebrow={data.orgName.trim() || "Your organization"} title="What's your role?" description="We'll tailor examples and defaults to how you work.">
              <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <Choice key={r.value} selected={data.role === r.value} onSelect={() => update({ role: r.value })} role="radio" align="start">
                    {r.label}
                  </Choice>
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step eyebrow="Almost there" title="What will you use Mindmap for?" description="Pick any that apply.">
              <div role="group" aria-label="Use cases" className="grid grid-cols-2 gap-2">
                {USE_CASES.map((u) => (
                  <Choice key={u.value} selected={data.useCases.includes(u.value)} onSelect={() => toggleUseCase(u.value)} role="checkbox" align="start" hint={u.hint}>
                    {u.label}
                  </Choice>
                ))}
              </div>
            </Step>
          )}

          <div className="mt-auto flex items-center justify-between pt-10">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-body-sm text-fg-secondary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {step > 0 && !last && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="h-9 cursor-pointer rounded-lg px-3 text-body-sm text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Skip
                </button>
              )}
              <button
                type="submit"
                disabled={!canContinue}
                className="corner-squircle h-9 cursor-pointer rounded-xl bg-inverted-solid px-4 text-body-sm font-medium text-on-inverted-fg outline-none transition-colors hover:bg-inverted-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
              >
                {last ? "Go to Mindmap" : "Continue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Step({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="motion-translate-y-in-[6px] motion-opacity-in-0 motion-duration-300 motion-ease-out">
      <p className="text-body-sm text-fg-tertiary">{eyebrow}</p>
      <h1 className="font-display mt-1 text-heading-5 text-fg-primary">{title}</h1>
      <p className="mt-2 text-body-sm text-fg-secondary">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Choice({
  selected,
  onSelect,
  role,
  align = "center",
  hint,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  role: "radio" | "checkbox";
  align?: "center" | "start";
  hint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "corner-squircle relative flex min-h-10 cursor-pointer flex-col rounded-xl px-3.5 py-2.5 text-body-sm outline-none transition-[background-color,box-shadow,color] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
        align === "center" ? "items-center justify-center text-center" : "items-start text-left",
        selected
          ? "bg-surface-container text-fg-primary shadow-[0_0_0_1.5px_var(--brand-solid)]"
          : "bg-surface-container/60 text-fg-secondary shadow-border hover:bg-surface-container hover:text-fg-primary",
      )}
    >
      <span className="font-medium">{children}</span>
      {hint && <span className="mt-0.5 text-caption-lg text-fg-tertiary">{hint}</span>}
      {selected && align === "start" && (
        <span className="absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-brand-solid text-on-brand-solid">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
