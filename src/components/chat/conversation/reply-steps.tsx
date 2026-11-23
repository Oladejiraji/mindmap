import { CheckIcon } from "@/components/icons/check-icon";

/* What the model read before replying, the same context the backend
 * builds (convex/lib/context.ts): notes from the parent nodes, then this
 * node's earlier messages. One row per step: check, step, muted detail. */
export function ReplySteps({ parentNotes, priorMessages }: { parentNotes: string[]; priorMessages: number }) {
  const steps: { label: string; detail: string }[] = [];
  if (parentNotes.length > 0) {
    const names = parentNotes.slice(-2).join(" · ");
    const more = parentNotes.length - 2;
    steps.push({ label: "Read parent notes", detail: more > 0 ? `${names} +${more}` : names });
  }
  if (priorMessages > 0) {
    steps.push({
      label: "Read the conversation",
      detail: `${priorMessages} ${priorMessages === 1 ? "message" : "messages"}`,
    });
  }
  if (steps.length === 0) return null;
  return (
    <ul className="mb-3 flex flex-col gap-1.5" aria-label="Context">
      {steps.map((s) => (
        <li key={s.label} className="flex min-w-0 items-center gap-2.5 text-body-sm">
          <CheckIcon className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
          <span className="shrink-0 text-fg-secondary">{s.label}</span>
          <span className="truncate text-fg-tertiary">{s.detail}</span>
        </li>
      ))}
    </ul>
  );
}
