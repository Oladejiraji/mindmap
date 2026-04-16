"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, MoreHorizontal } from "lucide-react";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNodesByThread, type Node } from "@/services/nodes/queries";
import type { Thread } from "@/services/threads/queries";
import type { Id } from "@convex/dataModel";

export function ThreadItem({ thread }: { thread: Thread }) {
  const { data: nodes } = useNodesByThread(thread._id);
  const pathname = usePathname();

  const flat = useMemo(() => (nodes ? flattenTree(nodes) : []), [nodes]);
  const isActive = pathname === `/t/${thread._id}`;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={`/t/${thread._id}`} />}
          isActive={isActive}
          className="text-xs"
          style={{ paddingRight: "2rem" }}
        >
          <Folder size={14} className="shrink-0 text-muted-foreground" />
          <span>{thread.name}</span>
        </SidebarMenuButton>
        <SidebarMenuAction showOnHover aria-label="Thread options">
          <MoreHorizontal size={14} />
        </SidebarMenuAction>
      </SidebarMenuItem>
      {flat.length > 0 && (
        <div className="flex flex-col gap-0.5 py-0.5">
          {flat.map((node) => {
            const nodeActive = pathname === `/t/${thread._id}/n/${node._id}`;
            return (
              <div key={node._id} className="group/node relative">
                <Link
                  href={`/t/${thread._id}/n/${node._id}`}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                    nodeActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70"
                  }`}
                  style={{ paddingLeft: `${(node.depth + 1) * 12 + 8}px` }}
                >
                  <Folder
                    size={12}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{node.title}</span>
                </Link>
                <button
                  className={`absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent ${
                    nodeActive
                      ? "opacity-100"
                      : "opacity-0 group-hover/node:opacity-100"
                  }`}
                  aria-label="Node options"
                >
                  <MoreHorizontal size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function flattenTree(nodes: Node[]): (Node & { depth: number })[] {
  const byParent = new Map<Id<"nodes"> | null, Node[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }

  const result: (Node & { depth: number })[] = [];
  function walk(parentId: Id<"nodes"> | null, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push({ ...node, depth });
      walk(node._id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}
