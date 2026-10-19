import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function InviteCard({
  orgName,
  role,
  accepted,
  loading,
  onAccept,
  onDecline,
}: {
  orgName: string;
  role: string;
  accepted: boolean;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      className={cn(
        "corner-squircle flex items-center gap-3 rounded-xl px-3.5 py-3 shadow-border transition-[background-color,box-shadow] duration-150",
        accepted
          ? "bg-surface-container shadow-[0_0_0_1.5px_var(--brand-solid)]"
          : "bg-surface-container/60",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-caption-lg font-semibold text-brand-fg">
        {orgName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-fg-primary">{orgName}</p>
        <p className="text-caption-lg text-fg-tertiary capitalize">{role}</p>
      </div>
      {accepted ? (
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-solid text-on-brand-solid">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="h-7 cursor-pointer rounded-lg px-2.5 text-caption-lg text-fg-tertiary outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="corner-squircle h-7 cursor-pointer rounded-lg bg-brand-solid px-2.5 text-caption-lg font-medium text-on-brand-solid outline-none transition-colors hover:bg-brand-solid-hover focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {loading ? "Joining…" : "Join"}
          </button>
        </div>
      )}
    </div>
  );
}
