"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { Skeleton } from "@/components/ui/skeleton";
import { useThread } from "@/services/threads/queries";
import { formatRelativeTime } from "@/lib/format-time";
import { handleError } from "@/lib/handle-error";
import { useRenameThread } from "@/services/threads/mutations";
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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const threadId = useThreadIdFromRoute();
  const { data: thread, isPending } = useThread(threadId);
  const { mutate: renameThread } = useRenameThread();

  const startEditing = () => {
    setDraft(thread?.name || "");
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== thread?.name && threadId) {
      renameThread({ threadId, name: next }).catch((err) =>
        handleError(err, "Failed to rename"),
      );
    }
    setIsEditing(false);
  };

  const cancelRename = () => {
    setDraft(thread?.name || "");
    setIsEditing(false);
  };

  return (
    <div className="absolute left-3 top-3 z-10 w-56">
      <div className="overflow-hidden rounded-lg border border-border/40 bg-white shadow-sm">
        <div className="flex h-11 w-full items-center gap-2 px-3">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/8">
            <CanvasIcon className="size-3.5 text-foreground/20" />
          </div>
          <div className="min-w-0 flex-1 text-left mb-1.5">
            {isPending ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={cancelRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    className="flex h-5 w-full min-w-0 items-center rounded bg-foreground/5 px-1 text-xs font-medium text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.08)] outline-none"
                  />
                ) : (
                  <p
                    onClick={startEditing}
                    className="cursor-text truncate rounded px-1 py-0.5 text-xs font-medium text-foreground transition-[background-color,box-shadow] duration-200 shadow-[0_0_0_1px_transparent] hover:bg-foreground/5 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                  >
                    {thread?.name ?? "Untitled"}
                  </p>
                )}
                <p className="px-1 text-11 leading-none text-foreground/35">
                  {formatRelativeTime(thread?._creationTime ?? 0)}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/8"
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 text-foreground/30 transition-transform duration-200",
                !open && "-rotate-90",
              )}
            />
          </button>
        </div>

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
