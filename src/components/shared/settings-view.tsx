"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/*
 * Settings pages (inside SettingsShell): a title bar, then sections of
 * one rounded panel with divided rows each.
 *   Account      who you're signed in as
 *   Preferences  what can be changed today, stored in this browser
 */

function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border-default px-6">
        <h1 className="text-body-sm font-medium text-fg-primary">{title}</h1>
      </header>
      <div className="mx-auto w-full max-w-[640px] space-y-10 px-6 pt-12 pb-16">{children}</div>
    </div>
  );
}

export function AccountSettings() {
  const { data: session } = authClient.useSession();
  return (
    <SettingsPage title="Account">
      <Section title="Profile" description="Your name and email come from how you signed in.">
        <Row label="Name">
          <span className="flex items-center gap-2.5">
            <UserAvatar size={24} />
            <span className="text-body-sm text-fg-primary">{session?.user?.name ?? "—"}</span>
          </span>
        </Row>
        <Row label="Email">
          <span className="text-body-sm text-fg-secondary">{session?.user?.email ?? "—"}</span>
        </Row>
      </Section>
    </SettingsPage>
  );
}

export function PreferencesSettings() {
  const [hints, setHints] = useCanvasHints();
  const [layout, setLayout] = useHomeLayout();
  return (
    <SettingsPage title="Preferences">
      <Section title="Canvas and Home" description="Saved in this browser.">
        <Row label="Canvas shortcut hints" hint="The pill at the bottom of the canvas that shows how to add nodes.">
          <Switch checked={hints} onCheckedChange={setHints} aria-label="Canvas shortcut hints" />
        </Row>
        <Row label="Home layout" hint="How projects are listed on Home.">
          <div role="radiogroup" aria-label="Home layout" className="flex rounded-lg bg-component p-0.5">
            {(["grid", "list"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={layout === value}
                onClick={() => setLayout(value)}
                className={cn(
                  "h-6 cursor-pointer rounded-md px-2.5 text-caption-lg font-medium capitalize outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  layout === value ? "bg-surface-container text-fg-primary shadow-border" : "text-fg-tertiary hover:text-fg-secondary",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Row>
      </Section>
    </SettingsPage>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="text-body-base font-medium text-fg-primary">{title}</h2>
      <p className="mt-1 text-body-sm text-fg-tertiary">{description}</p>
      <div className="mt-4 divide-y divide-border-default overflow-hidden rounded-xl bg-surface-container shadow-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        <p className="text-body-sm text-fg-primary">{label}</p>
        {hint && <p className="mt-0.5 text-caption-lg text-fg-tertiary">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
