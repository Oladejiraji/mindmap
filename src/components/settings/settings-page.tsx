import type { ReactNode } from "react";

export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 pt-14 pb-16">
      <h1 className="font-display text-heading-5 text-fg-primary">{title}</h1>
      <p className="mt-1.5 text-body-sm text-fg-secondary">{description}</p>
      <div className="mt-10 space-y-9">{children}</div>
    </div>
  );
}
