import type { ReactNode } from "react";

export function Step({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="motion-translate-y-in-[6px] motion-opacity-in-0 motion-duration-300 motion-ease-out">
      <p className="text-body-sm text-fg-tertiary">{eyebrow}</p>
      <h1 className="font-display mt-1 text-heading-5 text-fg-primary">{title}</h1>
      <p className="mt-2 text-body-sm text-fg-secondary">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
