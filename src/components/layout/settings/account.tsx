"use client";

import { useMutation } from "convex/react";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { api } from "@convex/api";
import { authClient } from "@/lib/auth-client";
import { ROLES } from "@/lib/onboarding";
import { handleError } from "@/lib/handle-error";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SettingsPage, Section, Row, Chips } from "@/components/settings";

export function AccountSettings() {
  const { data: session } = authClient.useSession();
  const { data: orgData } = useAuthedConvexQuery(api.organizations.current, {});
  const updateJobRole = useMutation(api.organizations.updateJobRole);
  const currentRole = orgData?.user?.jobRole ?? null;

  const handleRoleChange = (role: typeof currentRole) => {
    if (!role) return;
    updateJobRole({ jobRole: role }).catch((err) =>
      handleError(err, "Failed to update role"),
    );
  };

  return (
    <SettingsPage
      title="Account"
      description="Your profile and your role in your organization."
    >
      <Section title="Profile">
        <Row label="Name" hint="From how you signed in.">
          <span className="flex items-center gap-2.5">
            <UserAvatar size={24} />
            <span className="text-body-sm text-fg-primary">
              {session?.user?.name ?? "—"}
            </span>
          </span>
        </Row>
        <Row label="Email" hint="Used to sign in.">
          <span className="text-body-sm text-fg-secondary">
            {session?.user?.email ?? "—"}
          </span>
        </Row>
      </Section>
      <Section title="Role">
        <Row
          label="What you do"
          hint="Tailors examples and defaults to how you work."
        />
        <Chips
          label="Role"
          role="radio"
          options={ROLES}
          isOn={(v) => currentRole === v}
          onToggle={handleRoleChange}
        />
      </Section>
    </SettingsPage>
  );
}
