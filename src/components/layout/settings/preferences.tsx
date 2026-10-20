"use client";

import { useState } from "react";
import { useCanvasHints, useHomeLayout } from "@/lib/preferences";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SettingsPage, Section, Row, Segmented } from "@/components/settings";

function LayoutPreview({
  layout,
  animate,
}: {
  layout: "grid" | "list";
  animate: boolean;
}) {
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
        className={cn(
          animate &&
            "motion-safe:motion-opacity-in-0 motion-safe:motion-translate-y-in-[3px] motion-safe:motion-duration-200 motion-safe:motion-ease-out",
        )}
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
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.78 0.12 245), var(--brand-solid) 70%)",
                  }}
                />
                <div
                  className={cn(block, "h-2", ["w-2/5", "w-1/4", "w-1/3"][i])}
                />
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

export function PreferencesSettings() {
  const [hints, setHints] = useCanvasHints();
  const [layout, setLayout] = useHomeLayout();
  const [switchedLayout, setSwitchedLayout] = useState(false);
  return (
    <SettingsPage
      title="Preferences"
      description="How the canvas and Home behave. Saved in this browser."
    >
      <Section title="Canvas">
        <Row
          label="Shortcut hints"
          hint="Show the pill at the bottom of the canvas that teaches how to add nodes."
        >
          <Switch
            checked={hints}
            onCheckedChange={setHints}
            aria-label="Shortcut hints"
          />
        </Row>
      </Section>
      <Section title="Home">
        <Row
          label="Layout"
          hint="How projects are listed on Home."
          below={<LayoutPreview layout={layout} animate={switchedLayout} />}
        >
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
