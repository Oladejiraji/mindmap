"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { authClient } from "@/lib/auth-client";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { ROLES, TEAM_SIZES, USE_CASES, useOnboarding, type UseCase } from "@/lib/onboarding";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { cn } from "@/lib/utils";
import { Step } from "./step";
import { Choice } from "./choice";
import { InviteCard } from "./invite-card";

/*
 * B2B onboarding, shown once after sign-up. Dynamic steps:
 *
 *   (invites)      only if the user has pending invitations
 *   organization   create a workspace — skippable, skipped if invite accepted
 *   role           what you do
 *   use case       what you'll use Mindmap for (multi-select)
 *
 * Two finish paths:
 *   - created org  → createWithOnboarding (org + membership + onboardedAt)
 *   - no org       → completeOnboarding   (just onboardedAt + jobRole)
 */

type StepId = "invites" | "organization" | "role" | "use-case";

const field =
  "corner-squircle h-10 w-full rounded-xl bg-surface-container px-3.5 text-body-base text-fg-primary shadow-border outline-none transition-shadow placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50";

export function OnboardingFlow() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [data, update] = useOnboarding();

  const { mutate: createWithOnboarding, isPending: isCreating } =
    useConvexMutation(api.organizations.createWithOnboarding);
  const { mutate: completeOnboarding, isPending: isCompleting } =
    useConvexMutation(api.organizations.completeOnboarding);
  const { mutate: acceptInviteMut, isPending: isAccepting } =
    useConvexMutation(api.invitations.accept);
  const { mutate: declineInviteMut } =
    useConvexMutation(api.invitations.decline);
  const pendingInvites = useQuery(api.invitations.pending);

  const [step, setStep] = useState<StepId | null>(null);
  const [joinedOrgId, setJoinedOrgId] = useState<string | null>(null);
  const [showInviteStep, setShowInviteStep] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0];
  const submitting = isCreating || isCompleting;

  if (pendingInvites !== undefined && !initialized) {
    setInitialized(true);
    const hasInvites = pendingInvites.length > 0;
    setShowInviteStep(hasInvites);
    setStep(hasInvites ? "invites" : "organization");
  }

  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = [];
    if (showInviteStep) s.push("invites");
    if (!joinedOrgId) s.push("organization");
    s.push("role", "use-case");
    return s;
  }, [showInviteStep, joinedOrgId]);

  if (!initialized || step === null) return null;

  const stepIndex = steps.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = step === "use-case";
  const hasOrgName = data.orgName.trim().length > 0;
  const canContinue = step === "organization" ? hasOrgName : true;

  // ── Navigation ──────────────────────────────────────────────

  const goNext = (from: StepId) => {
    const transitions: Record<string, StepId> = {
      invites: joinedOrgId ? "role" : "organization",
      organization: "role",
      role: "use-case",
    };
    const next = transitions[from];
    if (next) setStep(next);
  };

  const goBack = () => {
    const transitions: Record<string, StepId | undefined> = {
      organization: showInviteStep ? "invites" : undefined,
      role: joinedOrgId ? (showInviteStep ? "invites" : undefined) : "organization",
      "use-case": "role",
    };
    const prev = transitions[step];
    if (prev) setStep(prev);
  };

  // ── Finish ──────────────────────────────────────────────────

  const finish = async () => {
    try {
      if (hasOrgName && !joinedOrgId) {
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

  const next = async () => {
    if (submitting) return;
    if (isLast) await finish();
    else goNext(step);
  };

  // ── Invite handlers ─────────────────────────────────────────

  const handleAcceptInvite = async (invitationId: Id<"invitations">) => {
    try {
      const result = await acceptInviteMut({ invitationId });
      setJoinedOrgId(result.orgId);
    } catch (err) {
      handleError(err, "Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (invitationId: Id<"invitations">) => {
    try {
      await declineInviteMut({ invitationId });
    } catch (err) {
      handleError(err, "Failed to decline invitation");
    }
  };

  // ── Data helpers ────────────────────────────────────────────

  const toggleUseCase = (value: UseCase) =>
    update({
      useCases: data.useCases.includes(value)
        ? data.useCases.filter((u) => u !== value)
        : [...data.useCases, value],
    });

  const skipOrg = () => {
    update({ orgName: "" });
    setStep("role");
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col items-center bg-sidebar px-6 py-10">
      <div className="flex w-full max-w-[480px] flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-4" />
          </span>
          <ol aria-label="Progress" className="flex items-center gap-1.5">
            {steps.map((id, i) => (
              <li
                key={id}
                aria-current={i === stepIndex ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-6 bg-fg-primary" : i < stepIndex ? "w-1.5 bg-fg-secondary" : "w-1.5 bg-fg-disabled",
                )}
              />
            ))}
          </ol>
        </div>

        <form
          className="mt-16 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (step !== "invites") void next();
          }}
        >
          {step === "invites" && (
            <Step
              eyebrow={firstName ? `Welcome, ${firstName}` : "Welcome"}
              title="You've been invited"
              description="Join an existing workspace, or create your own in the next step."
            >
              <div className="flex flex-col gap-2">
                {pendingInvites?.map((inv) => (
                  <InviteCard
                    key={inv._id}
                    orgName={inv.orgName}
                    role={inv.role}
                    accepted={joinedOrgId === inv.orgId}
                    loading={isAccepting}
                    onAccept={() => handleAcceptInvite(inv._id)}
                    onDecline={() => handleDeclineInvite(inv._id)}
                  />
                ))}
                {pendingInvites?.length === 0 && joinedOrgId && (
                  <p className="text-body-sm text-fg-secondary">
                    You&apos;ve joined a workspace. Let&apos;s continue setting up your profile.
                  </p>
                )}
              </div>
            </Step>
          )}

          {step === "organization" && (
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

          {step === "role" && (
            <Step
              eyebrow={data.orgName.trim() || "Your profile"}
              title="What's your role?"
              description="We'll tailor examples and defaults to how you work."
            >
              <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <Choice key={r.value} selected={data.role === r.value} onSelect={() => update({ role: r.value })} role="radio" align="start">
                    {r.label}
                  </Choice>
                ))}
              </div>
            </Step>
          )}

          {step === "use-case" && (
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
            {!isFirst ? (
              <button
                type="button"
                onClick={goBack}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-body-sm text-fg-secondary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {(step === "organization" || (step === "role" && !isLast)) && (
                <button
                  type="button"
                  onClick={step === "organization" ? skipOrg : () => setStep("use-case")}
                  className="h-9 cursor-pointer rounded-lg px-3 text-body-sm text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Skip
                </button>
              )}
              <button
                type={step === "invites" ? "button" : "submit"}
                onClick={step === "invites" ? () => void next() : undefined}
                disabled={(step !== "invites" && !canContinue) || submitting}
                className="corner-squircle h-9 cursor-pointer rounded-xl bg-inverted-solid px-4 text-body-sm font-medium text-on-inverted-fg outline-none transition-colors hover:bg-inverted-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
              >
                {submitting ? "Setting up…" : isLast ? "Go to Mindmap" : "Continue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
