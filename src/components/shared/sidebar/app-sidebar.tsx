"use client";

import { usePathname } from "next/navigation";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { useThread } from "@/services/threads/queries";
import type { Id } from "@convex/dataModel";
import { ThreadItem } from "./thread-item";
import { capitalizeFirst } from "@/lib/helpers";
import { formatRelativeTime } from "@/lib/format-time";

function useThreadIdFromRoute() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match?.[1] as Id<"threads"> | undefined;
}

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const threadId = useThreadIdFromRoute();
  const { data: thread, isPending } = useThread(threadId);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col ">
      <div className="flex h-10.5 shrink-0 items-center gap-2 px-3 ">
        <div className="flex size-6 items-center justify-center rounded-md bg-foreground/8">
          <CanvasIcon className="size-3.5 text-foreground/20" />
        </div>
        <div className="min-w-0 flex-1">
          {isPending ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              <p className="truncate text-xs font-medium text-foreground">
                {capitalizeFirst(thread?.name || "") ?? "Untitled"}
              </p>
              <p className="text-11 leading-none text-foreground/35">
                {formatRelativeTime(thread?._creationTime ?? 0)}
              </p>
            </>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="flex size-7 items-center justify-center text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          <SidebarToggleIcon open={open} className="text-current" />
        </button>
      </div>

      <div className="flex-1 overflow-y-aut mt-4 px-2 py-2">
        <p className="px-2 pb-1.5 text-11 font-medium text-foreground/35">
          Nodes
        </p>
        {isPending ? (
          <div className="flex flex-col gap-1 px-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        ) : thread ? (
          <ThreadItem thread={thread} />
        ) : null}
      </div>
    </aside>
  );
}
