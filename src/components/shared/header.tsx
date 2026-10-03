"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import {
  SidebarToggleIcon,
  ChevronRightIcon,
} from "@/components/icons/sidebar-toggle";
import { CanvasToggle } from "@/components/shared/canvas-toggle";
import { useThread } from "@/services/threads/queries";
import { useNode } from "@/services/nodes/queries";
import type { Id } from "@convex/dataModel";

function useRouteIds() {
  const pathname = usePathname();
  const threadMatch = pathname.match(/^\/t\/([^/]+)/);
  const nodeMatch = pathname.match(/^\/t\/[^/]+\/n\/([^/]+)/);
  return {
    threadId: threadMatch?.[1] as Id<"threads"> | undefined,
    nodeId: nodeMatch?.[1] as Id<"nodes"> | undefined,
  };
}

function useBreadcrumb() {
  const { threadId, nodeId } = useRouteIds();
  const threadQuery = useThread(threadId);
  const nodeQuery = useNode(nodeId);
  return {
    threadName: threadQuery.data?.name,
    nodeName: nodeQuery.data?.title,
  };
}

export function Header() {
  const { open, toggleSidebar } = useSidebar();
  const { threadName, nodeName } = useBreadcrumb();

  return (
    <header className="flex h-10.5 shrink-0 items-center border-b border-foreground/3 px-2">
      <nav className="flex min-w-0 flex-1 items-center gap-1">
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-1 text-13 text-foreground/60 hover:text-foreground/80 transition-colors"
        >
          <div className="flex size-7 items-center justify-center">
            <SidebarToggleIcon open={open} className="text-current" />
          </div>
          <span className="font-diatype tracking-tight">Mindmap</span>
        </button>

        {threadName && (
          <>
            <div className="size-4 flex items-center justify-center">
              <ChevronRightIcon className="text-foreground/30" />
            </div>
            <span className="font-diatype text-13 tracking-tight text-foreground/87 truncate">
              {threadName}
            </span>
          </>
        )}

        {nodeName && (
          <>
            <div className="size-4 flex items-center justify-center">
              <ChevronRightIcon className="text-foreground/30" />
            </div>
            <span className="font-diatype text-13 tracking-tight text-foreground/60 truncate">
              {nodeName}
            </span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2 pl-3">
        <CanvasToggle />
      </div>
    </header>
  );
}
