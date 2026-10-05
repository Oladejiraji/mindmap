"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { Skeleton } from "@/components/ui/skeleton";
import { useThread } from "@/services/threads/queries";
import { capitalizeFirst } from "@/lib/helpers";
import { formatRelativeTime } from "@/lib/format-time";
import { ThreadItem } from "./sidebar/thread-item";
import type { Id } from "@convex/dataModel";
import { cn } from "@/lib/utils";

function useThreadIdFromRoute() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match?.[1] as Id<"threads"> | undefined;
}

export function CanvasPanel() {
  const [open, setOpen] = useState(true);
  const threadId = useThreadIdFromRoute();
  const { data: thread, isPending } = useThread(threadId);

  return (
    <div className="absolute left-3 top-3 z-10 w-56">
      <div className="overflow-hidden rounded-lg border border-border/40 bg-white shadow-sm">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-full items-center gap-2 px-3"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/8">
            <CanvasIcon className="size-3.5 text-foreground/20" />
          </div>
          <div className="min-w-0 flex-1 text-left">
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
          <ChevronDownIcon
            className={cn(
              "size-3.5 shrink-0 text-foreground/30 transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/40 px-2 py-2">
                <p className="px-2 pb-1.5 text-11 font-medium text-foreground/35">
                  Nodes
                </p>
                {isPending ? (
                  <div className="flex flex-col gap-1 px-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-5/6" />
                  </div>
                ) : thread ? (
                  <ThreadItem thread={thread} />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
