import { Skeleton } from "@/components/ui/skeleton";

/** A conversation loading: alternating message and reply shapes. */
export function ConversationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2 px-3">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2 px-3">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}
