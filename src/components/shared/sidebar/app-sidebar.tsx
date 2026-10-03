"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import {
  HomeIcon,
  LogoIcon,
  SettingsIcon,
} from "@/components/icons/sidebar-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";
import { useThreads } from "@/services/threads/queries";
import { ThreadItem } from "./thread-item";

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { data: threads, isPending } = useThreads();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarHeader className="px-4 pt-3 pb-0">
        <div className="size-6 flex items-center justify-center">
          <LogoIcon className={collapsed ? "mx-auto" : ""} />
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-14">
        <SidebarGroup className="gap-1 px-3 pt-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === routes.home}
                tooltip="Home"
                size="sm"
                render={<Link href={routes.home} />}
              >
                <HomeIcon className="size-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings" size="sm">
                <SettingsIcon className="size-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {collapsed ? (
          <SidebarGroup className="gap-1 px-3 pt-9">
            <div className="mx-auto h-4 w-8 rounded bg-[#E1E1E1]/50" />
          </SidebarGroup>
        ) : (
          <SidebarGroup className="gap-1 px-3 pt-0">
            <SidebarGroupLabel className="px-2 text-xs text-sidebar-foreground/40">
              Threads
            </SidebarGroupLabel>
            {isPending ? (
              <div className="flex flex-col gap-1 px-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            ) : (
              threads?.map((thread) => (
                <ThreadItem key={thread._id} thread={thread} />
              ))
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
