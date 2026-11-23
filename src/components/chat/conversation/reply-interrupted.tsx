import { RenderIf } from "@/components/shared/render-if";

/* Under a reply that ended early. A failed one can be tried again while
 * it's the last message; the failed reply stays in the record. */
export function ReplyInterrupted({ failed, onRetry }: { failed: boolean; onRetry?: () => void }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-body-sm text-fg-tertiary">
      {failed ? "Reply failed." : "Stopped."}
      <RenderIf condition={failed && onRetry !== undefined}>
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer font-medium text-fg-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          Try again
        </button>
      </RenderIf>
    </p>
  );
}
