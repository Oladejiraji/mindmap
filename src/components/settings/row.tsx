import type { ReactNode } from "react";

export function Row({
  label,
  hint,
  children,
  below,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex min-h-9 items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg-primary">{label}</p>
          {hint && (
            <p className="mt-0.5 text-body-sm text-fg-tertiary">{hint}</p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
      {below && <div className="mt-3.5">{below}</div>}
    </div>
  );
}
