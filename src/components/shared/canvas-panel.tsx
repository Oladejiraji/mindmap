"use client";

import { useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NodesIcon } from "@/components/icons/nodes-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { Skeleton } from "@/components/ui/skeleton";
import { useThread } from "@/services/threads/queries";
import { formatRelativeTime } from "@/lib/format-time";
import { handleError } from "@/lib/handle-error";
import { useRenameThread } from "@/services/threads/mutations";
import { ThreadItem } from "./sidebar/thread-item";
import type { Id } from "@convex/dataModel";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

function useThreadIdFromRoute() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match?.[1] as Id<"threads"> | undefined;
}

/*
 * Project panel: project name (click to rename) + node tree.
 * - floating: the card over the canvas (hidden on node pages, which embed it)
 * - embedded: fills a sidebar column on the node page; always expanded
 * - docked: in chat view, sits above the composer, right-aligned (the
 *   chat renders it; the floating one steps aside)
 */
export function CanvasPanel({ variant = "floating" }: { variant?: "floating" | "embedded" | "docked" }) {
  const pathname = usePathname();
  const inChat = useSearchParams().get("view") === "chat";
  const embedded = variant === "embedded";
  // Floating/docked: rests as just the nodes icon; click it to open
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const threadId = useThreadIdFromRoute();
  const { data: thread, isPending } = useThread(threadId);
  const renameThread = useRenameThread();

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

  if (!threadId || (!embedded && /\/n\//.test(pathname))) return null;
  if (variant === "floating" && inChat) return null;
  const expanded = embedded || open;
  const position =
    variant === "docked" ? "absolute right-0 bottom-full z-10 mb-4" : "absolute top-3 left-3 z-10";

  if (!embedded && !open) {
    return (
      <div className={position}>
        <Tip label={thread?.name ?? "Project"} side={variant === "docked" ? "top" : "bottom"}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Show project nodes"
            aria-expanded={false}
            className="flex size-9 cursor-pointer items-center justify-center rounded-xl bg-surface-container text-fg-secondary shadow-default outline-none transition-colors hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <NodesIcon className="size-4" />
          </button>
        </Tip>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "h-full"
          : variant === "docked"
            ? "absolute right-0 bottom-full z-10 mb-4 w-56"
            : "absolute top-3 left-3 z-10 w-56"
      }
    >
      <div className={embedded ? "flex h-full flex-col" : "overflow-hidden rounded-xl border border-border/40 bg-white shadow-default"}>
        <div className="flex w-full items-center gap-2 p-3">
          {/* Project icon: the nodes mark on its own; floating, it folds the
              panel back down to just the icon */}
          {embedded ? (
            <NodesIcon className="size-4 shrink-0 text-fg-secondary" />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide project nodes"
              aria-expanded
              className="-m-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-secondary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <NodesIcon className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1 text-left">
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
                    className="flex h-3 w-full min-w-0 items-center rounded bg-foreground/5 px-1 text-caption-lg/[12px] font-medium text-fg-primary shadow-border outline-none"
                  />
                ) : (
                  <p
                    onClick={startEditing}
                    className="cursor-text truncate rounded px-1 text-caption-lg/[12px] font-medium text-fg-primary transition-[background-color,box-shadow] duration-200 shadow-[0_0_0_1px_transparent] hover:bg-foreground/5 hover:shadow-border"
                  >
                    {thread?.name ?? "Untitled"}
                  </p>
                )}
                <p className="mt-1.5 px-1 text-caption-lg/[12px] text-fg-tertiary">
                  {formatRelativeTime(thread?._creationTime ?? 0)}
                </p>
              </>
            )}
          </div>
          {!embedded && <button
            onClick={() => setOpen((o) => !o)}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-foreground/8"
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 text-fg-tertiary transition-transform duration-200",
                !open && "-rotate-90",
              )}
            />
          </button>}
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className={embedded ? "px-2 pt-4" : "border-t border-border/40 px-2 py-2"}>
                <p className="px-2 pb-1.5 text-caption-base font-medium text-fg-tertiary">
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
