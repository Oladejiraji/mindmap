"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { api } from "@convex/api";
import { useTeams, type Team } from "@/lib/teams";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SettingsPage, Section } from "@/components/settings";

export function TeamsSettings() {
  const { data: orgData } = useAuthedConvexQuery(api.organizations.current, {});
  const orgName = orgData?.org?.name?.trim();
  return (
    <SettingsPage
      title="Teams"
      description={`Group people in ${orgName || "your workspace"} by how they work, like Product or Research.`}
    >
      <TeamsSection />
    </SettingsPage>
  );
}

function TeamsSection() {
  const { teams, create, rename, remove } = useTeams();
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    create(draft);
    setDraft("");
  };
  return (
    <Section>
      {teams.map((team) => (
        <TeamRow
          key={`${team.id}:${team.name}`}
          team={team}
          onRename={(name) => rename(team.id, name)}
          onRemove={() => remove(team.id)}
        />
      ))}
      <form
        className="flex items-center gap-3 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-fg-tertiary">
          <Plus className="size-3.5" />
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="New team name"
          aria-label="New team name"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="corner-squircle h-7 cursor-pointer rounded-lg bg-inverted-solid px-3 text-caption-lg font-medium text-on-inverted-fg outline-none transition-colors hover:bg-inverted-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:bg-component disabled:text-fg-tertiary"
        >
          Create team
        </button>
      </form>
    </Section>
  );
}

function TeamRow({
  team,
  onRename,
  onRemove,
}: {
  team: Team;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(team.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const commit = () => {
    if (name.trim() && name.trim() !== team.name) onRename(name);
    else setName(team.name);
  };

  return (
    <div className="group/team flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className="corner-squircle flex size-7 shrink-0 items-center justify-center rounded-lg text-caption-lg font-semibold text-white"
        style={{ background: team.color }}
      >
        {team.name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setName(team.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Team name: ${team.name}`}
        className="min-w-0 flex-1 rounded-md bg-transparent px-1 -mx-1 text-body-sm font-medium text-fg-primary outline-none hover:bg-transparent-hover focus-visible:bg-component"
      />
      <span className="text-caption-lg text-fg-tertiary">Only you</span>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${team.name}`}
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-tertiary opacity-0 outline-none transition-[opacity,colors] group-hover/team:opacity-100 hover:bg-transparent-hover hover:text-danger-fg focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${team.name}?`}
        description="This team will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onRemove}
      />
    </div>
  );
}
