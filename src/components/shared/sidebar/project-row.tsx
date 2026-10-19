"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvex, useMutation } from "convex/react";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal, Pencil, SquarePen, Trash2 } from "lucide-react";
import { api } from "@convex/api";
import type { Doc } from "@convex/dataModel";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useRenameThread } from "@/services/threads/mutations";
import { closeTab } from "@/lib/tabs";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { popupDivider, popupRow, popupSurface, SIDEBAR_INSET } from "./popover-styles";

/*
 * A project in the sidebar. On hover (or while its menu is open) two
 * actions appear at the right, ChatGPT-style:
 *   ✎  new chat — a fresh branch off the project's root, opened in chat
 *   …  Rename (inline) and Delete (confirmed)
 */

const action =
  "flex size-6 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover data-popup-open:text-fg-primary [&_svg]:size-4";
const menuItem = popupRow;

export function ProjectRow({ thread, rowClassName }: { thread: Doc<"threads">; rowClassName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const convex = useConvex();
  const { mutate: renameThread } = useRenameThread();
  const removeThread = useMutation(api.threads.remove);
  const createBranch = useMutation(api.nodes.createEmptyBranch);
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const href = routes.thread(thread._id);
  const name = thread.name || "Untitled";

  const commitRename = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== thread.name) {
      renameThread({ threadId: thread._id, name: next }).catch((err) => handleError(err, "Failed to rename"));
    }
  };

  const newChat = async () => {
    try {
      const nodes = await convex.query(api.nodes.listByThread, { threadId: thread._id });
      const root = nodes.find((n) => n.parentId === null);
      if (!root) return;
      const { childId } = await createBranch({ parentId: root._id });
      router.push(`${href}?view=chat&node=${childId}`);
    } catch (err) {
      handleError(err, "Failed to start a chat");
    }
  };

  const remove = async () => {
    try {
      await removeThread({ threadId: thread._id });
      const next = closeTab(href, pathname);
      if (pathname === href) router.push(next ?? routes.home);
    } catch (err) {
      handleError(err, "Failed to delete project");
    }
  };

  if (editing) {
    return (
      <SidebarMenuItem>
        <div className={cn("flex h-8 items-center gap-2.5 rounded-md bg-transparent-hover px-2", rowClassName)}>
          <NodeTabIcon className="size-4 shrink-0 text-fg-tertiary" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Project name"
            className="min-w-0 flex-1 bg-transparent text-fg-primary outline-none"
          />
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem ref={rowRef} className="group/project">
      <SidebarMenuButton
        isActive={pathname.startsWith(href)}
        className={cn(rowClassName, "group-hover/project:pr-15", menuOpen && "pr-15")}
        render={<Link href={href} />}
      >
        <NodeTabIcon className="size-4" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {/* Last activity; the hover actions take its place. */}
        <span
          className={cn(
            "shrink-0 text-caption-lg font-normal text-fg-tertiary tabular-nums group-focus-within/project:hidden group-hover/project:hidden",
            menuOpen && "hidden",
          )}
        >
          {formatRelativeTime(thread.updatedAt ?? thread._creationTime).replace(/ ago$/, "")}
        </span>
      </SidebarMenuButton>

      <div
        className={cn(
          "absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/project:opacity-100 group-hover/project:opacity-100",
          menuOpen && "opacity-100",
        )}
      >
        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Trigger aria-label={`Options for ${name}`} className={action}>
            <MoreHorizontal />
          </Menu.Trigger>
          <Menu.Portal>
            {/* Under the row, on the sidebar's 16px content edge (rows sit at 12px). */}
            <Menu.Positioner anchor={rowRef} side="bottom" align="start" alignOffset={SIDEBAR_INSET - 12} sideOffset={4} className="z-50">
              <Menu.Popup className={cn(popupSurface, "p-1.5")}>
                <Menu.Item
                  className={menuItem}
                  onClick={() => {
                    setDraft(thread.name);
                    setEditing(true);
                  }}
                >
                  <Pencil />
                  Rename
                </Menu.Item>
                <Menu.Separator className={cn(popupDivider, "-mx-1.5 my-1.5")} />
                <Menu.Item className={cn(menuItem, "text-danger-fg [&>svg:first-child]:text-danger-fg")} onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        <button type="button" aria-label={`New chat in ${name}`} title="New chat" onClick={() => void newChat()} className={action}>
          <SquarePen />
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${name}”?`}
        description="This deletes the project with all of its nodes and messages. It can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void remove()}
      />
    </SidebarMenuItem>
  );
}
