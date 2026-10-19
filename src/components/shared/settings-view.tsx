"use client";

import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/*
 * Settings: Account (who you're signed in as) and Preferences (what can
 * be changed today, all stored in this browser). Same title bar as Get
 * started; each section is one rounded panel of divided rows.
 */
export function SettingsView() {
  const { data: session } = authClient.useSession();
  const [hints, setHints] = useCanvasHints();
  const [layout, setLayout] = useHomeLayout();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border-default px-6">
        <h1 className="text-body-sm font-medium text-fg-primary">Settings</h1>
      </header>

      <div className="mx-auto w-full max-w-[640px] space-y-10 px-6 pt-12 pb-16">
        <Section title="Account" description="Your name and email come from how you signed in.">
          <Row label="Profile">
            <span className="flex items-center gap-2.5">
              <UserAvatar size={24} />
              <span className="text-body-sm text-fg-primary">{session?.user?.name ?? "—"}</span>
            </span>
          </Row>
          <Row label="Email">
            <span className="text-body-sm text-fg-secondary">{session?.user?.email ?? "—"}</span>
          </Row>
        </Section>

        <Section id="preferences" title="Preferences" description="Saved in this browser.">
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
      </div>
    </div>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id ?? title}-title`}>
      <h2 id={`${id ?? title}-title`} className="text-body-base font-medium text-fg-primary">
        {title}
      </h2>
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
