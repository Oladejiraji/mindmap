"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RootNodeIcon, BranchNodeIcon, LeafNodeIcon } from "@/components/icons/node-icons";
import { RenderIf } from "@/components/shared/render-if";
import { useNodesByThread } from "@/services/nodes/queries";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import type { Thread } from "@/services/threads/queries";
import type { Id } from "@convex/dataModel";
import { flattenTree, type FlatNode } from "@/lib/tree";
import { routes } from "@/lib/routes";

interface ThreadItemProps {
  thread: Thread;
  hideRoot?: boolean;
}

export function ThreadItem({ thread, hideRoot }: ThreadItemProps) {
  const { data: nodes } = useNodesByThread(thread._id);
  const [collapsed, setCollapsed] = useState<Set<Id<"nodes">>>(new Set());

  const toggleCollapse = useCallback((nodeId: Id<"nodes">) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const flat = useMemo(() => {
    if (!nodes) return [];
    const tree = flattenTree(nodes);
    if (!hideRoot) return tree;
    return tree
      .filter((n) => n.parentId !== null)
      .map((n) => ({ ...n, depth: Math.max(0, n.depth - 1) }));
  }, [nodes, hideRoot]);

  const visible = useMemo(() => {
    if (collapsed.size === 0) return flat;
    let skipDepth: number | null = null;
    const result: FlatNode[] = [];
    for (const node of flat) {
      if (skipDepth !== null && node.depth > skipDepth) continue;
      skipDepth = null;
      result.push(node);
      if (collapsed.has(node._id)) {
        skipDepth = node.depth;
      }
    }
    return result;
  }, [flat, collapsed]);

  if (flat.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((node) => (
        <NodeItem
          key={node._id}
          threadId={thread._id}
          node={node}
          isCollapsed={collapsed.has(node._id)}
          onToggleCollapse={node.isLeaf ? undefined : toggleCollapse}
        />
      ))}
    </div>
  );
}

interface INodeItemProps {
  threadId: Id<"threads">;
  node: FlatNode;
  isCollapsed: boolean;
  onToggleCollapse?: (nodeId: Id<"nodes">) => void;
}

function NodeItem({ threadId, node, isCollapsed, onToggleCollapse }: INodeItemProps) {
  const pathname = usePathname();

  const isRoot = node.parentId === null;
  const nodeRoute = isRoot
    ? routes.thread(threadId)
    : routes.node(threadId, node._id);
  const isActive = pathname === nodeRoute;

  const paddingLeft = `${node.depth * 12 + 8}px`;

  return (
    <Link
      href={nodeRoute}
      className={cn(
        "flex h-7 items-center rounded-md text-xs transition-colors",
        isActive
          ? "bg-foreground/8 font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-sidebar-accent-foreground",
      )}
      style={{ paddingLeft }}
    >
      {onToggleCollapse ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCollapse(node._id);
          }}
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground/60"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-150",
              isCollapsed && "-rotate-90",
            )}
          />
        </button>
      ) : (
        <span className="size-5" />
      )}
      <RenderIf condition={isRoot}>
        <RootNodeIcon className="mx-1.5 size-3.5 shrink-0 text-muted-foreground" />
      </RenderIf>
      <RenderIf condition={!isRoot && !!onToggleCollapse}>
        <BranchNodeIcon className="mx-1.5 size-3.5 shrink-0 text-muted-foreground" />
      </RenderIf>
      <RenderIf condition={!isRoot && !onToggleCollapse}>
        <LeafNodeIcon className="mx-1.5 size-3.5 shrink-0 text-muted-foreground" />
      </RenderIf>
      <span className="truncate">{node.title}</span>
    </Link>
  );
}
