"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { authClient } from "@/lib/auth-client";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { ROLES, TEAM_SIZES, USE_CASES, useOnboarding, type Role, type TeamSize, type UseCase } from "@/lib/onboarding";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { cn } from "@/lib/utils";
import { InviteCard } from "./invite-card";

/*
 * B2B onboarding, shown once after sign-up, laid out like interfere.com/join:
 * a single-page form on the left (paired fields, one full-width Continue)
 * and a dotted panel on the right with the product line.
 *
 *   invitations   only if the user has pending invites (join one, or not)
 *   form          organization name + team size, role + work email,
 *                 use cases (chips)
 *
 * Finishing:
 *   - with an org name (and no invite joined) → createWithOnboarding
 *   - otherwise (joined an invite, or "Skip for now") → completeOnboarding
 */

const field =
  "corner-squircle h-10 w-full rounded-xl bg-surface-container px-3.5 text-body-sm text-fg-primary shadow-border outline-none transition-shadow placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-fg-tertiary";

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

  return (
    <div className="grid min-h-svh bg-surface-container lg:grid-cols-2">
      {/* Form */}
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-20">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-solid text-on-brand-solid">
          <LogoIcon className="h-auto w-4" />
        </span>

        <form
          className="mx-auto mt-16 flex w-full max-w-[440px] flex-1 flex-col lg:mx-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) void finish();
          }}
        >
          <h1 className="font-display text-heading-4 text-fg-primary">Get started</h1>
          <p className="mt-3 text-body-base text-fg-secondary">
            Set up your workspace. Mindmap is a shared space for your team&apos;s thinking: ask, branch and trace ideas together.
          </p>

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

          <div className="mt-10 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
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
                    value={data.teamSize ?? ""}
                    onChange={(v) => update({ teamSize: (v || null) as TeamSize | null })}
                    options={TEAM_SIZES}
                  />
                </Field>
              </>
            )}
            <Field label="Your role">
              <Select value={data.role ?? ""} onChange={(v) => update({ role: (v || null) as Role | null })} options={ROLES} />
            </Field>
            <Field label="Work email">
              <input value={session?.user?.email ?? ""} disabled readOnly aria-readonly className={field} />
            </Field>
          </div>

          <fieldset className="mt-5">
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
                      "corner-squircle h-8 cursor-pointer rounded-full px-3.5 text-body-sm outline-none transition-[background-color,box-shadow,color] focus-visible:ring-3 focus-visible:ring-ring/50",
                      on
                        ? "bg-brand-subtle text-brand-fg shadow-[0_0_0_1px_var(--brand-solid)]"
                        : "bg-surface-container text-fg-secondary shadow-border hover:text-fg-primary",
                    )}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={!canContinue}
            className="corner-squircle mt-10 h-11 w-full cursor-pointer rounded-xl bg-brand-solid text-body-sm font-medium text-on-brand-solid outline-none transition-colors hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
          >
            {submitting ? "Setting up…" : "Continue"}
          </button>
          {!joinedOrgId && (
            <button
              type="button"
              onClick={() => void finish(true)}
              disabled={submitting}
              className="mx-auto mt-3 h-8 cursor-pointer rounded-lg px-3 text-body-sm text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Skip for now
            </button>
          )}

          <p className="mt-auto border-t border-border-default/60 pt-5 text-caption-lg text-fg-tertiary">
            Signed in as {session?.user?.email ?? "…"}
          </p>
        </form>
      </div>

      {/* Product panel: dotted texture + the line, no invented testimonial */}
      <div
        aria-hidden
        className="relative hidden items-center justify-center overflow-hidden bg-sidebar lg:flex"
        style={{ backgroundImage: "radial-gradient(oklch(0 0 0 / 0.12) 1px, transparent 1px)", backgroundSize: "10px 10px" }}
      >
        <div className="max-w-[520px] px-12 text-center">
          <p className="font-serif text-[2rem] leading-[1.3] text-fg-primary">
            &ldquo;Ask one question, follow every branch, and keep the whole thread of your team&apos;s thinking.&rdquo;
          </p>
          <div className="mt-8 flex items-center justify-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-brand-solid text-on-brand-solid">
              <LogoIcon className="h-auto w-3.5" />
            </span>
            <span className="text-body-sm font-medium text-fg-primary">Mindmap</span>
          </div>
        </div>
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

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | "";
  onChange: (value: T | "") => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className={cn(field, "cursor-pointer appearance-none pr-9", !value && "text-fg-tertiary")}
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-tertiary" />
    </div>
  );
}
