"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { ROLES, TEAM_SIZES, USE_CASES, useOnboarding } from "@/lib/onboarding";
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
 * (organization, use cases), Hotkeys (every shortcut).
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="px-4 pb-2.5 text-body-sm text-fg-tertiary">{title}</h2>
      <div className="corner-squircle divide-y divide-border-default/[0.28] overflow-hidden rounded-3xl bg-surface-container shadow-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-6 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg-primary">{label}</p>
        {hint && <p className="mt-0.5 text-body-sm text-fg-tertiary">{hint}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
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
  const [onboarding, update] = useOnboarding();
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
        <Chips label="Role" role="radio" options={ROLES} isOn={(v) => onboarding.role === v} onToggle={(role) => update({ role })} />
      </Section>
    </SettingsPage>
  );
}

/* Personal › Preferences */
export function PreferencesSettings() {
  const [hints, setHints] = useCanvasHints();
  const [layout, setLayout] = useHomeLayout();
  return (
    <SettingsPage title="Preferences" description="How the canvas and Home behave. Saved in this browser.">
      <Section title="Canvas">
        <Row label="Shortcut hints" hint="Show the pill at the bottom of the canvas that teaches how to add nodes.">
          <Switch checked={hints} onCheckedChange={setHints} aria-label="Shortcut hints" />
        </Row>
      </Section>
      <Section title="Home">
        <Row label="Layout" hint="How projects are listed on Home.">
          <Segmented
            label="Home layout"
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            value={layout}
            onChange={setLayout}
          />
        </Row>
      </Section>
    </SettingsPage>
  );
}

/* Workspace › General: the organization from onboarding. */
export function GeneralSettings() {
  const [data, update] = useOnboarding();
  return (
    <SettingsPage title="General" description="Your organization's workspace. Saved in this browser until workspaces are on the server.">
      <Section title="Organization">
        <Row label="Name" hint="Shown across your workspace.">
          <input
            value={data.orgName}
            onChange={(e) => update({ orgName: e.target.value })}
            placeholder="Acme Inc."
            aria-label="Organization name"
            className={field}
          />
        </Row>
        <Row label="Team size" hint="How many people work there.">
          <Segmented label="Team size" options={TEAM_SIZES} value={data.teamSize} onChange={(teamSize) => update({ teamSize })} />
        </Row>
      </Section>
      <Section title="Use cases">
        <Row label="What your team uses Mindmap for" hint="Pick any that apply." />
        <Chips
          label="Use cases"
          role="checkbox"
          options={USE_CASES}
          isOn={(v) => data.useCases.includes(v)}
          onToggle={(v) => update({ useCases: data.useCases.includes(v) ? data.useCases.filter((x) => x !== v) : [...data.useCases, v] })}
        />
      </Section>
    </SettingsPage>
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
