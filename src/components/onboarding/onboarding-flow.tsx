"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, FlaskConical, Package } from "lucide-react";
import { FlagIcon } from "@/components/icons/flag-icon";
import { ContentIcon } from "@/components/icons/content-icon";
import { DesignIcon } from "@/components/icons/design-icon";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { AuthCanvas } from "@/components/auth-canvas/auth-canvas";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { authClient } from "@/lib/auth-client";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { ROLES, TEAM_SIZES, useOnboarding, type Role, type TeamSize } from "@/lib/onboarding";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { Select } from "@/components/ui/select";
import { InviteCard } from "./invite-card";

/*
 * B2B onboarding, shown once after sign-up, laid out like interfere.com/join:
 * the form in an inset white card on the left (a centred 480px column,
 * paired fields, Skip and Continue) and the sign-up page's node canvas on
 * the page background to the right.
 *
 *   invitations   only if the user has pending invites (join one, or not)
 *   form          organization name + team size, role + work email
 *
 * Finishing:
 *   - with an org name (and no invite joined) → createWithOnboarding
 *   - otherwise (joined an invite, or "Skip for now") → completeOnboarding
 * then Get started opens with the walkthrough over it (?tour=1).
 */

const ROLE_ICONS: Record<Role, ReactNode> = {
  product: <Package />,
  design: <DesignIcon />,
  engineering: <ContentIcon />,
  research: <FlaskConical />,
  leadership: <FlagIcon />,
  other: <Ellipsis />,
};

// Hover: #f5f5f5. Focus: a 2px ring at 70% that fades in (150ms
// ease-out), so the field lights up gently; instant under reduced motion
const field =
  "corner-squircle h-10 w-full rounded-3xl bg-surface-container px-3.5 text-body-sm text-fg-primary shadow-border outline-none transition-[box-shadow,background-color] duration-150 ease-out enabled:hover:bg-[#f5f5f5] placeholder:text-fg-tertiary focus-visible:ring-2 focus-visible:ring-ring/70 motion-reduce:transition-none disabled:text-fg-tertiary";

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
      // The walkthrough opens over Get started (components/onboarding/walkthrough)
      router.replace(`${routes.getStarted}?tour=1`);
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

  if (pendingInvites === undefined) return null;

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      {/* Form card (interfere.com/join): white, inset from the page edges
          with a hairline border; the form is a 560px column centred in it */}
      <main className="flex flex-col border-border-default bg-surface-container px-6 py-16 lg:my-1.5 lg:ms-1 lg:rounded-3xl lg:border-[0.5px]">
        <form
          className="mx-auto flex w-full max-w-120 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) void finish();
          }}
        >
          {/* Logo at the top; the title, fields and actions centred together
              as one group (10px title to subtitle, 40px to the fields, 32px
              to the actions); the signed-in line at the foot */}
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-4" />
          </span>

          <div className="flex flex-1 flex-col">
          <div className="my-auto py-10">
            <div className="space-y-2.5">
              <h1 className="font-display text-heading-4 text-fg-primary">Get started</h1>
              <p className="text-body-base font-medium text-fg-secondary">
                Set up your workspace. Mindmap is a shared space for your team&apos;s thinking.
              </p>
            </div>

            {pendingInvites.length > 0 && (
              <div className="mt-10">
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

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            </div>

            {/* Skip and Continue side by side on the right */}
            <div className="mt-8 flex items-center justify-end gap-4">
              <div className="flex items-center gap-2">
                {!joinedOrgId && (
                  <button
                    type="button"
                    onClick={() => void finish(true)}
                    disabled={submitting}
                    className="corner-squircle h-9 cursor-pointer rounded-3xl px-3.5 text-body-sm font-medium text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canContinue}
                  className="corner-squircle h-9 cursor-pointer rounded-3xl bg-brand-solid px-4 text-body-sm font-medium text-on-brand-solid outline-none transition-[background-color,color,scale] duration-200 ease-out hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8">
            <div role="separator" className="h-[0.5px] bg-border-default" />
            <p className="truncate text-caption-lg text-fg-tertiary">Signed in as {session?.user?.email ?? "…"}</p>
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
