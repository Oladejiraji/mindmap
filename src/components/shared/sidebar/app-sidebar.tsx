"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreads } from "@/services/threads/queries";
import { ThreadItem } from "./thread-item";
import { NewChatButton } from "./new-chat-button";

export function AppSidebar() {
  const { data: threads, isPending } = useThreads();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/" className="text-sm font-semibold">
          Mindmap
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0 pt-4">
          <SidebarGroupContent>
            <NewChatButton />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pt-1">
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {isPending ? (
              <div className="flex flex-col gap-2 px-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            ) : !threads?.length ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No chats yet.
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {threads.map((thread) => (
                  <ThreadItem key={thread._id} thread={thread} />
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
