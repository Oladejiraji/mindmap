"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreads } from "@/services/threads/queries";
import { ThreadItem } from "./thread-item";

export function AppSidebar() {
  const { data: threads, isPending } = useThreads();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 text-sm font-semibold">
        Mindmap
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Threads</SidebarGroupLabel>
          <SidebarGroupContent>
            {isPending ? (
              <div className="flex flex-col gap-2 px-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            ) : !threads?.length ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No threads yet.
              </p>
            ) : (
              <SidebarMenu>
                {threads.map((thread) => (
                  <ThreadItem key={thread._id} thread={thread} />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
