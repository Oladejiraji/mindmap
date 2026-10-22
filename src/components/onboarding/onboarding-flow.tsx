"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Code, Ellipsis, Flag, FlaskConical, Package, PenTool } from "lucide-react";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { AuthCanvas } from "@/components/auth-canvas/auth-canvas";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { authClient } from "@/lib/auth-client";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { ROLES, TEAM_SIZES, USE_CASES, useOnboarding, type Role, type TeamSize, type UseCase } from "@/lib/onboarding";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { InviteCard } from "./invite-card";
import { MakeItYours } from "./make-it-yours";

/*
 * B2B onboarding, shown once after sign-up, laid out like interfere.com/join:
 * the form in an inset white card on the left (a centred 560px column,
 * paired fields, one full-width Continue) and the sign-up page's node
 * canvas on the page background to the right.
 *
 *   invitations   only if the user has pending invites (join one, or not)
 *   form          organization name + team size, role + work email,
 *                 use cases (chips)
 *
 * Finishing:
 *   - with an org name (and no invite joined) → createWithOnboarding
 *   - otherwise (joined an invite, or "Skip for now") → completeOnboarding
 */

const ROLE_ICONS: Record<Role, ReactNode> = {
  product: <Package />,
  design: <PenTool />,
  engineering: <Code />,
  research: <FlaskConical />,
  leadership: <Flag />,
  other: <Ellipsis />,
};

const field =
  "corner-squircle h-10 w-full rounded-3xl bg-surface-container px-3.5 text-body-sm text-fg-primary shadow-border outline-none transition-shadow placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-fg-tertiary";

export function OnboardingFlow() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [data, update] = useOnboarding();

  const { mutate: createWithOnboarding, isPending: isCreating } = useConvexMutation(api.organizations.createWithOnboarding);
  const { mutate: completeOnboarding, isPending: isCompleting } = useConvexMutation(api.organizations.completeOnboarding);
  const { mutate: acceptInviteMut, isPending: isAccepting } = useConvexMutation(api.invitations.accept);
  const { mutate: declineInviteMut } = useConvexMutation(api.invitations.decline);
  // Gated on auth: a signed-in-only query must not fire before the token.
  const { data: pendingInvites } = useAuthedConvexQuery(api.invitations.pending, {});

  const [joinedOrgId, setJoinedOrgId] = useState<string | null>(null);
  // 1: workspace details; 2: "Make it yours", a walkthrough of settings
  const [step, setStep] = useState<1 | 2>(1);
  const submitting = isCreating || isCompleting;
  const hasOrgName = data.orgName.trim().length > 0;
  const canContinue = (hasOrgName || !!joinedOrgId) && !submitting;

  const finish = async (skipOrg = false) => {
    if (submitting) return;
    try {
      if (!skipOrg && hasOrgName && !joinedOrgId) {
        await createWithOnboarding({
          name: data.orgName.trim(),
          teamSize: data.teamSize ?? undefined,
          useCases: data.useCases,
          jobRole: data.role ?? undefined,
        });
      } else {
        await completeOnboarding({ jobRole: data.role ?? undefined });
      }
      update({ completedAt: Date.now() });
      router.replace(routes.getStarted);
    } catch (err) {
      handleError(err, "Failed to complete setup");
    }
  };

  const acceptInvite = async (invitationId: Id<"invitations">) => {
    try {
      const result = await acceptInviteMut({ invitationId });
      setJoinedOrgId(result.orgId);
    } catch (err) {
      handleError(err, "Failed to accept invitation");
    }
  };

  const declineInvite = async (invitationId: Id<"invitations">) => {
    try {
      await declineInviteMut({ invitationId });
    } catch (err) {
      handleError(err, "Failed to decline invitation");
    }
  };

  const toggleUseCase = (value: UseCase) =>
    update({ useCases: data.useCases.includes(value) ? data.useCases.filter((u) => u !== value) : [...data.useCases, value] });

  if (pendingInvites === undefined) return null;

  if (step === 2) {
    return (
      <div className="min-h-svh bg-background lg:p-1.5">
        <main className="mx-auto flex min-h-svh max-w-5xl flex-col border-border-default bg-surface-container px-6 py-10 lg:min-h-[calc(100svh-12px)] lg:rounded-3xl lg:border-[0.5px] lg:px-10">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-4" />
          </span>
          <div className="my-auto py-10">
            <MakeItYours />
          </div>
          <div className="flex items-center justify-between gap-4">
            <StepDots step={2} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="h-9 cursor-pointer rounded-xl px-3.5 text-body-sm text-fg-secondary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                disabled={submitting}
                className="corner-squircle h-9 cursor-pointer rounded-xl bg-brand-solid px-4 text-body-sm font-medium text-on-brand-solid outline-none transition-[background-color,scale] duration-200 ease-out hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100 disabled:cursor-default disabled:opacity-60"
              >
                {submitting ? "Setting up…" : "Continue"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      {/* Form card (interfere.com/join): white, inset from the page edges
          with a hairline border; the form is a 560px column centred in it */}
      <main className="flex flex-col border-border-default bg-surface-container px-6 py-16 lg:my-1.5 lg:ms-1 lg:rounded-3xl lg:border-[0.5px]">
        <form
          className="mx-auto flex w-full max-w-120 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) setStep(2);
          }}
        >
          {/* Spacing follows interfere.com/join: 32px from the logo to the
              title, 10px title to subtitle, 56px to the fields; fields on a
              16px grid, centred in the space left; actions pinned below */}
          <header className="space-y-8">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
              <LogoIcon className="h-auto w-4" />
            </span>
            <div className="space-y-2.5">
              <h1 className="font-display text-heading-4 text-fg-primary">Get started</h1>
              <p className="text-body-base text-fg-secondary">
                Set up your workspace. Mindmap is a shared space for your team&apos;s thinking.
              </p>
            </div>
          </header>

          {pendingInvites.length > 0 && (
            <div className="mt-8">
              <p className="text-body-sm font-medium text-fg-primary">You&apos;ve been invited</p>
              <div className="mt-2 flex flex-col gap-2">
                {pendingInvites.map((inv) => (
                  <InviteCard
                    key={inv._id}
                    orgName={inv.orgName}
                    role={inv.role}
                    accepted={joinedOrgId === inv.orgId}
                    loading={isAccepting}
                    onAccept={() => void acceptInvite(inv._id)}
                    onDecline={() => void declineInvite(inv._id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-14 flex flex-1 flex-col">
          <div className="my-auto grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!joinedOrgId && (
              <>
                <Field label="Organization name">
                  <input
                    autoFocus
                    value={data.orgName}
                    onChange={(e) => update({ orgName: e.target.value })}
                    placeholder="Acme Inc."
                    className={field}
                  />
                </Field>
                <Field label="Team size">
                  <Select
                    className="rounded-3xl"
                    aria-label="Team size"
                    value={data.teamSize}
                    onChange={(v) => update({ teamSize: v as TeamSize | null })}
                    options={TEAM_SIZES.map((t) => ({ ...t, itemLabel: `${t.label} employees` }))}
                  />
                </Field>
              </>
            )}
            <Field label="Your role">
              <Select className="rounded-3xl" aria-label="Your role" value={data.role} onChange={(v) => update({ role: v as Role | null })} options={ROLES.map((r) => ({ ...r, icon: ROLE_ICONS[r.value] }))} />
            </Field>
            <Field label="Work email">
              <input value={session?.user?.email ?? ""} disabled readOnly aria-readonly className={field} />
            </Field>

          <fieldset className="sm:col-span-2">
            <legend className="text-body-sm font-medium text-fg-primary">What will you use Mindmap for?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {USE_CASES.map((u) => {
                const on = data.useCases.includes(u.value);
                return (
                  <button
                    key={u.value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    title={u.hint}
                    onClick={() => toggleUseCase(u.value)}
                    className={cn(
                      "corner-squircle h-8 cursor-pointer rounded-full px-3.5 text-body-sm outline-none transition-[background-color,color] focus-visible:ring-3 focus-visible:ring-ring/50",
                      on
                        ? "bg-brand-subtle text-brand-fg"
                        : "bg-component text-fg-secondary hover:text-fg-primary",
                    )}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          </div>

          <div className="mt-auto flex flex-col gap-4 pt-8">
          <button
            type="submit"
            disabled={!canContinue}
            className="corner-squircle h-11 w-full cursor-pointer rounded-3xl bg-brand-solid text-body-sm font-medium text-on-brand-solid outline-none transition-[background-color,color,scale] duration-200 ease-out hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
          >
            Continue
          </button>
          {!joinedOrgId && (
            <button
              type="button"
              onClick={() => void finish(true)}
              disabled={submitting}
              className="-my-2 h-8 cursor-pointer self-center rounded-lg px-3 text-body-sm text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Skip for now
            </button>
          )}

          <div role="separator" className="h-[0.5px] bg-border-default" />
          <div className="flex items-center justify-between gap-4">
            <p className="truncate text-caption-lg text-fg-tertiary">Signed in as {session?.user?.email ?? "…"}</p>
            <StepDots step={1} />
          </div>
          </div>
          </div>
        </form>
      </main>

      {/* The sign-up page's node canvas, straight on the page background */}
      <div className="relative hidden lg:block">
        <AuthCanvas />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-body-sm font-medium text-fg-primary">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

/* Where you are in onboarding: one dot per step, the current one wider. */
function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out",
            n === step ? "w-4 bg-fg-primary" : "w-1.5 bg-fg-disabled",
          )}
        />
      ))}
    </div>
  );
}
