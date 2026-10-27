"use client";

import { useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { NodesIcon } from "@/components/icons/nodes-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { Skeleton } from "@/components/ui/skeleton";
import { useThread } from "@/services/threads/queries";
import { formatRelativeTime } from "@/lib/format-time";
import { handleError } from "@/lib/handle-error";
import { useRenameThread } from "@/services/threads/mutations";
import { ThreadItem } from "@/components/layout/sidebar/thread-item";
import type { Id } from "@convex/dataModel";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

function useThreadIdFromRoute() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match?.[1] as Id<"threads"> | undefined;
}

function PanelHeader({
  thread,
  isPending,
  embedded,
  open,
  setOpen,
}: {
  thread: { name: string; _creationTime: number } | null | undefined;
  isPending: boolean;
  embedded: boolean;
  open: boolean;
  setOpen: (open: boolean | ((o: boolean) => boolean)) => void;
}) {
  const threadId = useThreadIdFromRoute();
  const renameThread = useRenameThread();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

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
    <div className="flex w-full items-center gap-2 p-3">
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
                onBlur={commitRename}
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
                role="button"
                tabIndex={0}
                onClick={startEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    startEditing();
                  }
                }}
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
      {!embedded && (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse nodes" : "Expand nodes"}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-foreground/8"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 text-fg-tertiary transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
        </button>
      )}
    </div>
  );
}

function NodeTree({
  thread,
  isPending,
  embedded,
}: {
  thread: Parameters<typeof ThreadItem>[0]["thread"] | null | undefined;
  isPending: boolean;
  embedded: boolean;
}) {
  return (
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
  );
}

/*
 * Project panel: project name (click to rename) + node tree.
 * - floating: the card over the canvas (hidden on node pages, which embed it)
 * - embedded: fills a sidebar column on the node page; always expanded
 * - docked: in chat view, sits above the composer, right-aligned (the
 *   chat renders it; the floating one steps aside)
 */
export function CanvasPanel({
  variant = "floating",
}: {
  variant?: "floating" | "embedded" | "docked";
}) {
  const pathname = usePathname();
  const inChat = useSearchParams().get("view") === "chat";
  const embedded = variant === "embedded";
  const [open, setOpen] = useState(false);
  const threadId = useThreadIdFromRoute();
  const { data: thread, isPending } = useThread(threadId);

  if (!threadId || (!embedded && /\/n\//.test(pathname))) return null;
  if (variant === "floating" && inChat) return null;

  const expanded = embedded || open;
  const position =
    variant === "docked"
      ? "absolute right-0 bottom-full z-10 mb-4"
      : "absolute top-3 left-3 z-10";

  const card = (
    <div
      className={
        embedded
          ? "flex h-full flex-col"
          : "overflow-hidden rounded-4xl bg-white shadow-default"
      }
    >
      <PanelHeader
        thread={thread}
        isPending={isPending}
        embedded={embedded}
        open={open}
        setOpen={setOpen}
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <NodeTree thread={thread} isPending={isPending} embedded={embedded} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (embedded) return <div className="h-full">{card}</div>;

  const origin = variant === "docked" ? "bottom right" : "top left";
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div
            key="card"
            className={cn(position, "w-56")}
            style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              scale: 0.97,
              filter: "blur(4px)",
              transition: { duration: 0.12, ease: "easeOut" },
            }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
          >
            {card}
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            className={position}
            style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              transition: { duration: 0.1, ease: "easeOut" },
            }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
          >
            <Tip
              label={thread?.name ?? "Project"}
              side={variant === "docked" ? "top" : "bottom"}
            >
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Show project nodes"
                aria-expanded={false}
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl bg-transparent-hover text-fg-secondary outline-none transition-colors hover:bg-component hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <NodesIcon className="size-4" />
              </button>
            </Tip>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
