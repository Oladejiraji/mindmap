"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { SettingsPage, Section, Row } from "@/components/settings";

function OrgNameField({
  name,
  onCommit,
}: {
  name: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const escapingRef = useRef(false);

  const commit = () => {
    if (escapingRef.current) {
      escapingRef.current = false;
      return;
    }
    const next = draft.trim();
    if (!next || next === name) {
      setDraft(name);
      return;
    }
    onCommit(next);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          escapingRef.current = true;
          setDraft(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="Acme Inc."
      aria-label="Organization name"
      className="corner-squircle h-8 w-56 rounded-lg bg-component px-2.5 text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

export function WorkspaceSettings() {
  const { data: orgData } = useAuthedConvexQuery(api.organizations.current, {});
  const updateOrg = useMutation(api.organizations.update);
  const org = orgData?.org;
  const orgName = org?.name ?? "";

  return (
    <SettingsPage
      title="Workspace"
      description="Your organization's workspace."
    >
      <Section title="Organization">
        <Row label="Name" hint="Shown across your workspace.">
          <OrgNameField
            key={orgName}
            name={orgName}
            onCommit={(next) => {
              if (!org) return;
              updateOrg({ orgId: org._id, name: next }).catch((err) =>
                handleError(err, "Failed to update organization"),
              );
            }}
          />
        </Row>
      </Section>
    </SettingsPage>
  );
}
