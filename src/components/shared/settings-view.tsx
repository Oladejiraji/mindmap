"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { api } from "@convex/api";
import { authClient } from "@/lib/auth-client";
import { useAnimatedReplies, useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { ROLES } from "@/lib/onboarding";
import { handleError } from "@/lib/handle-error";
import { useTeams, type Team } from "@/lib/teams";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/*
 * Settings pages, structured like Pond's:
 *   page      title (Inter Display 24px) + one-line description
 *   section   a muted label above one rounded panel
 *   row       label + description on the left, the control on the right,
 *             rows divided by hairlines
 * Pages: Account (profile, role), Preferences (canvas, home), General
 * (organization, teams, use cases), Hotkeys (every shortcut).
 */

function SettingsPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-14 pb-16">
      <h1 className="font-display text-heading-5 text-fg-primary">{title}</h1>
      <p className="mt-1.5 text-body-sm text-fg-secondary">{description}</p>
      <div className="mt-10 space-y-9">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      {title && <h2 className="pb-2.5 text-body-sm text-fg-tertiary">{title}</h2>}
      <div className="corner-squircle divide-y divide-border-default/[0.28] overflow-hidden rounded-3xl bg-surface-container shadow-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, below }: { label: string; hint?: string; children?: ReactNode; below?: ReactNode }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex min-h-9 items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg-primary">{label}</p>
          {hint && <p className="mt-0.5 text-body-sm text-fg-tertiary">{hint}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
      {below && <div className="mt-3.5">{below}</div>}
    </div>
  );
}

/* Skeleton of Home in the chosen layout, so the setting shows what it does. */
// animate: true once you've switched layouts here, so the preview doesn't
// animate in when the page loads
function LayoutPreview({ layout, animate }: { layout: "grid" | "list"; animate: boolean }) {
  const block = "rounded-sm bg-component-active";
  return (
    <div
      aria-hidden
      className="corner-squircle overflow-hidden rounded-2xl bg-background px-5 pt-4 pb-5 shadow-border"
    >
      <div className="flex items-center justify-between">
        <div className={cn(block, "h-2.5 w-16")} />
        <div className={cn(block, "h-4 w-10 rounded-md")} />
      </div>
      <div className="mt-3 h-px bg-border-default/60" />
      <div
        key={layout}
        className={cn(animate && "motion-safe:motion-opacity-in-0 motion-safe:motion-translate-y-in-[3px] motion-safe:motion-duration-200 motion-safe:motion-ease-out")}
      >
        {layout === "grid" ? (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="corner-squircle aspect-4/3 rounded-lg bg-component" />
                <div className={cn(block, "mt-2 h-2 w-3/4")} />
                <div className={cn(block, "mt-1.5 h-1.5 w-1/2 opacity-60")} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2">
                <div
                  className="size-4 shrink-0 rounded"
                  style={{ background: "linear-gradient(135deg, oklch(0.78 0.12 245), var(--brand-solid) 70%)" }}
                />
                <div className={cn(block, "h-2", ["w-2/5", "w-1/4", "w-1/3"][i])} />
                <div className={cn(block, "ml-auto h-1.5 w-8 opacity-60")} />
                <div className={cn(block, "h-1.5 w-8 opacity-60")} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="corner-squircle flex rounded-lg bg-component p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 cursor-pointer rounded-md px-2.5 text-caption-lg font-medium whitespace-nowrap capitalize outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            value === o.value ? "bg-surface-container text-fg-primary shadow-border" : "text-fg-tertiary hover:text-fg-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chips<T extends string>({
  label,
  options,
  isOn,
  onToggle,
  role,
}: {
  label: string;
  options: { value: T; label: string }[];
  isOn: (v: T) => boolean;
  onToggle: (v: T) => void;
  role: "radio" | "checkbox";
}) {
  return (
    <div role={role === "radio" ? "radiogroup" : "group"} aria-label={label} className="flex flex-wrap gap-2 px-4 py-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={role}
          aria-checked={isOn(o.value)}
          onClick={() => onToggle(o.value)}
          className={cn(
            "corner-squircle h-7 cursor-pointer rounded-full px-3 text-caption-lg font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            isOn(o.value) ? "bg-brand-subtle text-brand-fg" : "bg-component text-fg-secondary hover:text-fg-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const field =
  "corner-squircle h-8 w-56 rounded-lg bg-component px-2.5 text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary focus-visible:ring-3 focus-visible:ring-ring/50";

/* Personal › Account */
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
    <SettingsPage title="Account" description="Your profile and your role in your organization.">
      <Section title="Profile">
        <Row label="Name" hint="From how you signed in.">
          <span className="flex items-center gap-2.5">
            <UserAvatar size={24} />
            <span className="text-body-sm text-fg-primary">{session?.user?.name ?? "—"}</span>
          </span>
        </Row>
        <Row label="Email" hint="Used to sign in.">
          <span className="text-body-sm text-fg-secondary">{session?.user?.email ?? "—"}</span>
        </Row>
      </Section>
      <Section title="Role">
        <Row label="What you do" hint="Tailors examples and defaults to how you work." />
        <Chips label="Role" role="radio" options={ROLES} isOn={(v) => currentRole === v} onToggle={handleRoleChange} />
      </Section>
    </SettingsPage>
  );
}

/* Personal › Preferences */
export function PreferencesSettings() {
  const [hints, setHints] = useCanvasHints();
  const [animatedReplies, setAnimatedReplies] = useAnimatedReplies();
  const [layout, setLayout] = useHomeLayout();
  const [switchedLayout, setSwitchedLayout] = useState(false);
  return (
    <SettingsPage title="Preferences" description="How the canvas, chat and Home behave. Saved in this browser.">
      <Section title="Canvas">
        <Row label="Shortcut hints" hint="Show the pill at the bottom of the canvas that teaches how to add nodes.">
          <Switch checked={hints} onCheckedChange={setHints} aria-label="Shortcut hints" />
        </Row>
      </Section>
      <Section title="Chat">
        <Row label="Animated replies" hint="Fade replies in word by word as they arrive.">
          <Switch checked={animatedReplies} onCheckedChange={setAnimatedReplies} aria-label="Animated replies" />
        </Row>
      </Section>
      <Section title="Home">
        <Row label="Layout" hint="How projects are listed on Home." below={<LayoutPreview layout={layout} animate={switchedLayout} />}>
          <Segmented
            label="Home layout"
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            value={layout}
            onChange={(next) => {
              setSwitchedLayout(true);
              setLayout(next);
            }}
          />
        </Row>
      </Section>
    </SettingsPage>
  );
}

/* Workspace › General: the organization from onboarding. */
/*
 * Administration › Workspace: the organization's name. Team size and use
 * cases are asked once at onboarding (to segment and tailor the account)
 * and aren't settings: the members list is the real team size.
 */
export function WorkspaceSettings() {
  const { data: orgData } = useAuthedConvexQuery(api.organizations.current, {});
  const updateOrg = useMutation(api.organizations.update);

  const org = orgData?.org;
  const orgName = org?.name ?? "";

  const saveOrg = (patch: { name?: string }) => {
    if (!org) return;
    updateOrg({ orgId: org._id, ...patch }).catch((err) =>
      handleError(err, "Failed to update organization"),
    );
  };

  return (
    <SettingsPage title="Workspace" description="Your organization's workspace.">
      <Section title="Organization">
        <Row label="Name" hint="Shown across your workspace.">
          <input
            value={orgName}
            onChange={(e) => saveOrg({ name: e.target.value })}
            placeholder="Acme Inc."
            aria-label="Organization name"
            className={field}
          />
        </Row>
      </Section>
    </SettingsPage>
  );
}

/* Administration › Teams: groups inside the organization. */
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

/* The teams list: one row per team, plus a row to add one. */
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
        <TeamRow key={team.id} team={team} onRename={(name) => rename(team.id, name)} onRemove={() => remove(team.id)} />
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

function TeamRow({ team, onRename, onRemove }: { team: Team; onRename: (name: string) => void; onRemove: () => void }) {
  const [name, setName] = useState(team.name);
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
        onClick={onRemove}
        aria-label={`Delete ${team.name}`}
        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-tertiary opacity-0 outline-none transition-[opacity,colors] group-hover/team:opacity-100 hover:bg-transparent-hover hover:text-danger-fg focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const HOTKEYS: { group: string; keys: { combo: string[]; label: string; hint: string }[] }[] = [
  { group: "App", keys: [{ combo: ["⌘", "B"], label: "Sidebar", hint: "Show or hide the sidebar." }] },
  {
    group: "Canvas",
    keys: [
      { combo: ["Tab"], label: "Add branch", hint: "Add a branch to the selected node (or the root)." },
      { combo: ["↵"], label: "Add sibling", hint: "Add a sibling next to the selected node." },
      { combo: ["?"], label: "Shortcuts", hint: "Show or hide the canvas shortcut list." },
      { combo: ["Esc"], label: "Close panel", hint: "Close the node side panel." },
    ],
  },
  {
    group: "Chat",
    keys: [
      { combo: ["↵"], label: "Send", hint: "Send the message." },
      { combo: ["⇧", "↵"], label: "New line", hint: "Start a new line without sending." },
    ],
  },
  {
    group: "Search",
    keys: [
      { combo: ["↑", "↓"], label: "Move", hint: "Move through results." },
      { combo: ["↵"], label: "Open", hint: "Open the highlighted result." },
    ],
  },
];

/* Personal › Hotkeys: every shortcut the app supports today. */
export function HotkeysSettings() {
  return (
    <SettingsPage title="Hotkeys" description="Every keyboard shortcut in Mindmap.">
      {HOTKEYS.map((g) => (
        <Section key={g.group} title={g.group}>
          {g.keys.map((k) => (
            <Row key={`${g.group}-${k.label}`} label={k.label} hint={k.hint}>
              <span className="flex gap-1">
                {k.combo.map((c) => (
                  <kbd
                    key={c}
                    className="flex h-6 min-w-6 items-center justify-center rounded-md bg-surface-container px-1.5 font-sans text-caption-lg font-medium text-fg-secondary inset-ring-[0.5px] inset-ring-border-strong"
                  >
                    {c}
                  </kbd>
                ))}
              </span>
            </Row>
          ))}
        </Section>
      ))}
    </SettingsPage>
  );
}
