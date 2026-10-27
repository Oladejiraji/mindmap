"use client";

import { SHORTCUTS } from "@/lib/shortcuts";
import { SettingsPage, Section, Row } from "@/components/settings";

export function HotkeysSettings() {
  return (
    <SettingsPage
      title="Hotkeys"
      description="Every keyboard shortcut in Mindmap."
    >
      {SHORTCUTS.map((g) => (
        <Section key={g.group} title={g.group}>
          {g.shortcuts.map((s) => (
            <Row key={`${g.group}-${s.label}`} label={s.label} hint={s.hint}>
              <span className="flex gap-1">
                {s.combo.map((c) => (
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
