"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder, GitBranch, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
import { DeleteNodeDialog } from "@/components/shared/delete-node-dialog";
import { useNodesByThread, type Node } from "@/services/nodes/queries";
import {
  useCreateEmptyBranch,
  useDeleteLeafNode,
  useDeleteSubtree,
  useRenameNode,
} from "@/services/nodes/mutations";
import type { Thread } from "@/services/threads/queries";
import type { Id } from "@convex/dataModel";
import { collectSubtree, flattenTree, type FlatNode } from "@/lib/tree";
import { showError } from "@/lib/toast";

const focusAndSelect = (el: HTMLInputElement | null) => {
  el?.focus();
  el?.select();
};

export function ThreadItem({ thread }: { thread: Thread }) {
  const { data: nodes } = useNodesByThread(thread._id);

  const flat = useMemo(() => (nodes ? flattenTree(nodes) : []), [nodes]);

  if (flat.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {flat.map((node) => (
        <NodeItem
          key={node._id}
          threadId={thread._id}
          node={node}
          allNodes={nodes ?? []}
        />
      ))}
    </div>
  );
}

function NodeItem({
  threadId,
  node,
  allNodes,
}: {
  threadId: Id<"threads">;
  node: FlatNode;
  allNodes: Node[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const renameNode = useRenameNode();
  const createEmptyBranch = useCreateEmptyBranch();
  const deleteLeafNode = useDeleteLeafNode();
  const deleteSubtree = useDeleteSubtree();

  const isActive = pathname === `/t/${threadId}/n/${node._id}`;
  const canDelete = node.isLeaf || node.parentId === null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleBranch = async () => {
    try {
      const { childId } = await createEmptyBranch({ parentId: node._id });
      router.push(`/t/${threadId}/n/${childId}`);
    } catch (err) {
      showError(err, "Failed to create branch");
    }
  };

  const redirectIfViewing = (subtreeIds: Set<Id<"nodes">>) => {
    const match = pathname.match(/^\/t\/[^/]+\/n\/([^/]+)/);
    const currentNodeId = match?.[1];
    if (!currentNodeId || !subtreeIds.has(currentNodeId as Id<"nodes">)) return;
    if (node.parentId === null) {
      router.push("/");
    } else {
      router.push(`/t/${threadId}/n/${node.parentId}`);
    }
  };

  const handleDeleteClick = () => {
    if (node.isLeaf) {
      redirectIfViewing(new Set([node._id]));
      deleteLeafNode({ nodeId: node._id }).catch((err) =>
        showError(err, "Failed to delete node"),
      );
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    redirectIfViewing(collectSubtree(allNodes, node._id));
    deleteSubtree({ nodeId: node._id }).catch((err) =>
      showError(err, "Failed to delete subtree"),
    );
  };

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== node.title) {
      renameNode({ nodeId: node._id, title: next }).catch((err) =>
        showError(err, "Failed to rename"),
      );
    }
    setIsEditing(false);
  };

  const cancelRename = () => {
    setDraft(node.title);
    setIsEditing(false);
  };

  const paddingLeft = `${node.depth * 12 + 8}px`;

  return (
    <div className="group/node relative">
      {isEditing ? (
        <div
          className="flex h-8 items-center gap-1.5 rounded-md pr-2 text-xs"
          style={{ paddingLeft }}
        >
          <Folder size={12} className="shrink-0 text-muted-foreground" />
          <input
            ref={focusAndSelect}
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
            className="h-6 min-w-0 flex-1 rounded border bg-background px-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ) : (
        <Link
          href={`/t/${threadId}/n/${node._id}`}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md pr-8 text-xs hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/70",
          )}
          style={{ paddingLeft }}
        >
          <Folder size={12} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{node.title}</span>
        </Link>
      )}

      {!isEditing && (
        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.Trigger
            aria-label="Node options"
            className={cn(
              "absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent",
              isActive || menuOpen
                ? "opacity-100"
                : "opacity-0 group-hover/node:opacity-100",
            )}
          >
            <MoreHorizontal size={12} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={4} align="end" className="z-50">
              <Menu.Popup className="min-w-32 rounded-md border bg-popover p-1 shadow-md">
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted"
                  onClick={() => {
                    setDraft(node.title);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-3" />
                  Rename
                </Menu.Item>
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted"
                  onClick={handleBranch}
                >
                  <GitBranch className="size-3" />
                  Branch here
                </Menu.Item>
                {canDelete && (
                  <Menu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-muted"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Menu.Item>
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}

      <DeleteNodeDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={node.title}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

