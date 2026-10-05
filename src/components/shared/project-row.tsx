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
import { useRenameThread } from "@/services/threads/mutations";
import type { Id } from "@convex/dataModel";

const menuItemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/70 transition-colors data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground outline-none";


export function ProjectRow({
  name,
  threadId,
  createdAt,
  updatedAt,
}: {
  name: string;
  threadId: string;
  createdAt: number;
  updatedAt?: number;
}) {
  const router = useRouter();
  const { mutate: removeThread } = useConvexMutation(api.threads.remove);
  const { mutate: renameThread } = useRenameThread();
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
        <ContextMenu.Trigger className="rounded-md">
          <Link
            href={href}
            className="group grid grid-cols-[1fr_8rem_8rem] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-foreground/4"
            onClick={(e) => {
              if (isRenaming) e.preventDefault();
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background-5">
                <CanvasIcon className="size-4 text-foreground/20" />
              </div>
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
                  className="block min-w-0 max-w-full truncate rounded-[3px] bg-transparent text-sm leading-none text-foreground outline-none ring-1 ring-primary py-px px-0.5 -mx-0.5"
                />
              ) : (
                <p className="truncate text-sm text-foreground">{name}</p>
              )}
            </div>
            <span className="text-xs text-foreground/30">
              {formatRelativeTime(createdAt)}
            </span>
            <span className="text-xs text-foreground/30">
              {formatRelativeTime(updatedAt ?? createdAt)}
            </span>
          </Link>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={4} className="z-50">
            <ContextMenu.Popup className="min-w-40 rounded-lg border border-foreground/8 bg-background p-1 shadow-lg outline-none">
              <ContextMenu.Item
                className={menuItemClass}
                onClick={() => router.push(href)}
              >
                Open
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menuItemClass}
                onClick={() => window.open(href, "_blank")}
              >
                Open in new tab
              </ContextMenu.Item>
              <ContextMenu.Separator className="my-1 h-px bg-foreground/8" />
              <ContextMenu.Item className={menuItemClass} onClick={startRename}>
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
