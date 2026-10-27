import type { ReactNode } from "react";

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      {title && (
        <h2 className="pb-2.5 text-body-sm text-fg-tertiary">{title}</h2>
      )}
      <div className="corner-squircle divide-y divide-border-default/[0.28] overflow-hidden rounded-3xl bg-surface-container shadow-border">
        {children}
      </div>
    </section>
  );
}
