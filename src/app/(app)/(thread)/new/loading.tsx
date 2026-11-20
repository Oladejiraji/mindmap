import { LogoIcon } from "@/components/icons/sidebar-toggle";
import { Skeleton } from "@/components/ui/skeleton";

// One per starter row, in varied lengths, as in ChatInput.
const STARTER_WIDTHS = ["w-40", "w-48", "w-36", "w-44"];

// Shown while the page fetches the greeting and starters. Mirrors the
// composer's layout so nothing jumps when it arrives.
export default function NewProjectLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 pb-[6vh]">
      <div className="flex w-full max-w-180 flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-xl bg-brand-solid text-on-brand-solid"
          >
            <LogoIcon className="h-auto w-5" />
          </span>
          {/* One line of text-heading-6 */}
          <div className="flex h-6 items-center">
            <Skeleton className="h-5 w-96 max-w-full bg-component-hover" />
          </div>
        </div>
        <div>
          {/* The large composer: p-4, a 96px text area, gap-2, a 36px toolbar */}
          <Skeleton className="h-43 rounded-5xl bg-component-hover" />
          <div aria-hidden className="mt-3 flex flex-col">
            {STARTER_WIDTHS.map((width) => (
              <div key={width} className="flex h-9 items-center gap-2.5 px-3">
                <Skeleton className="size-4 shrink-0 rounded bg-component-hover" />
                <Skeleton className={`h-3 rounded bg-component-hover ${width}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
