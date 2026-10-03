"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContextMenu } from "@base-ui/react/context-menu";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { api } from "@convex/api";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { handleError } from "@/lib/handle-error";
import type { Doc, Id } from "@convex/dataModel";
import type { OptimisticLocalStore } from "convex/browser";

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/70 transition-colors data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground outline-none";

const renameOptimisticUpdate = (
  localStore: OptimisticLocalStore,
  args: { threadId: Id<"threads">; name: string },
) => {
  const threads = localStore.getQuery(api.threads.list, {}) as
    | Doc<"threads">[]
    | undefined;
  if (threads) {
    localStore.setQuery(
      api.threads.list,
      {},
      threads.map((t) =>
        t._id === args.threadId ? { ...t, name: args.name } : t,
      ),
    );
  }
};

export function ProjectCard({
  name,
  threadId,
  createdAt,
}: {
  name: string;
  threadId: string;
  createdAt: number;
}) {
  const router = useRouter();
  const { mutate: removeThread } = useConvexMutation(api.threads.remove);
  const { mutate: renameThread } = useConvexMutation(
    api.threads.rename,
    renameOptimisticUpdate,
  );
  const [showDelete, setShowDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const href = routes.thread(threadId);

  const handleDelete = async () => {
    try {
      await removeThread({ threadId: threadId as Id<"threads"> });
    } catch (err) {
      handleError(err, "Failed to delete project");
    }
  };

  const startRename = () => {
    setRenameValue(name);
    setIsRenaming(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const commitRename = async () => {
    setIsRenaming(false);
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === name) return;
    try {
      await renameThread({
        threadId: threadId as Id<"threads">,
        name: trimmed,
      });
    } catch (err) {
      handleError(err, "Failed to rename project");
    }
  };

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger className="rounded-lg">
          <Link
            href={href}
            className="group relative block rounded-lg p-2"
            onClick={(e) => {
              if (isRenaming) e.preventDefault();
            }}
          >
            <div className="absolute inset-0 rounded-lg bg-foreground/8 scale-[0.97] opacity-0 transition-all duration-200 ease-out group-hover:scale-100 group-hover:opacity-100" />
            <div className="relative flex aspect-4/3 items-center justify-center rounded-md bg-background-5">
              <CanvasIcon className="size-8 text-foreground/20" />
            </div>
            <div className="px-0.5 pt-2.5">
              {isRenaming ? (
                <input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitRename();
                    }
                    if (e.key === "Escape") {
                      setIsRenaming(false);
                    }
                  }}
                  onBlur={() => setIsRenaming(false)}
                  className="block max-w-full truncate rounded-[3px] bg-transparent text-11 font-medium leading-none text-foreground outline-none ring-1 ring-primary py-px px-0.5 -mx-0.5"
                />
              ) : (
                <p className="truncate text-11 font-medium text-foreground">
                  {name}
                </p>
              )}
              <p className="text-11 text-foreground/40">
                {formatRelativeTime(createdAt)}
              </p>
            </div>
          </Link>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={4} className="z-50">
            <ContextMenu.Popup className="min-w-40 rounded-lg border border-foreground/8 bg-background p-1 shadow-lg outline-none">
              <ContextMenu.Item
                className={itemClass}
                onClick={() => router.push(href)}
              >
                Open
              </ContextMenu.Item>
              <ContextMenu.Item
                className={itemClass}
                onClick={() => window.open(href, "_blank")}
              >
                Open in new tab
              </ContextMenu.Item>
              <ContextMenu.Separator className="my-1 h-px bg-foreground/8" />
              <ContextMenu.Item className={itemClass} onClick={startRename}>
                Rename
              </ContextMenu.Item>
              <ContextMenu.Item
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-500/80 transition-colors data-[highlighted]:bg-red-500/8 data-[highlighted]:text-red-500 outline-none"
                onClick={() => setShowDelete(true)}
              >
                Delete
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={`Delete "${name}"?`}
        description="This will delete the project and all its contents. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
