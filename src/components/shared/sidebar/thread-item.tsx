"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteNodeDialog } from "@/components/shared/delete-node-dialog";
import { useNodesByThread, type Node } from "@/services/nodes/queries";
import {
  useDeleteLeafNode,
  useDeleteSubtree,
  useRenameNode,
} from "@/services/nodes/mutations";
import { useRemoveThread } from "@/services/threads/mutations";
import type { Thread } from "@/services/threads/queries";
import type { Id } from "@convex/dataModel";
import { collectSubtree, flattenTree, type FlatNode } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { routes } from "@/lib/routes";
import EditDropdown from "./edit-dropdown";

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

interface INodeItemProps {
  threadId: Id<"threads">;
  node: FlatNode;
  allNodes: Node[];
}

function NodeItem({ threadId, node, allNodes }: INodeItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const renameNode = useRenameNode();

  const deleteLeafNode = useDeleteLeafNode();
  const deleteSubtree = useDeleteSubtree();
  const removeThread = useRemoveThread();

  const isRoot = node.parentId === null;
  const nodeRoute = isRoot
    ? routes.thread(threadId)
    : routes.node(threadId, node._id);
  const isActive = pathname === nodeRoute;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const redirectIfViewing = (subtreeIds: Set<Id<"nodes">>) => {
    const isOnCanvas = pathname === routes.thread(threadId);
    const nodeMatch = pathname.match(/^\/t\/[^/]+\/n\/([^/]+)/);
    const viewingNodeId = nodeMatch?.[1];

    const shouldRedirect =
      (isOnCanvas && isRoot) ||
      (viewingNodeId && subtreeIds.has(viewingNodeId as Id<"nodes">));

    if (!shouldRedirect) return;

    if (isRoot) {
      router.push(routes.home);
    } else if (isOnCanvas) {
      return;
    } else {
      router.push(routes.node(threadId, node.parentId!));
    }
  };

  const handleDeleteClick = () => {
    if (node.isLeaf) {
      redirectIfViewing(new Set([node._id]));
      const deletion = isRoot
        ? removeThread({ threadId })
        : deleteLeafNode({ nodeId: node._id });
      deletion.catch((err) =>
        handleError(
          err,
          isRoot ? "Failed to delete thread" : "Failed to delete node",
        ),
      );
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    redirectIfViewing(collectSubtree(allNodes, node._id));
    const deletion = isRoot
      ? removeThread({ threadId })
      : deleteSubtree({ nodeId: node._id });
    deletion.catch((err) =>
      handleError(
        err,
        isRoot ? "Failed to delete thread" : "Failed to delete subtree",
      ),
    );
  };

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== node.title) {
      renameNode({ nodeId: node._id, title: next }).catch((err) =>
        handleError(err, "Failed to rename"),
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
          href={nodeRoute}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md pr-8 text-xs hover:bg-background-5 hover:text-sidebar-accent-foreground",
            isActive
              ? "bg-background-5 text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/70",
          )}
          style={{ paddingLeft }}
        >
          <Folder size={12} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{node.title}</span>
        </Link>
      )}

      {!isEditing && (
        <EditDropdown
          handleDeleteClick={handleDeleteClick}
          node={node}
          threadId={threadId}
          isActive={isActive}
          setDraft={setDraft}
          setIsEditing={setIsEditing}
        />
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
