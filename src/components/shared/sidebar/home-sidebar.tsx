"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { HomeIcon } from "@/components/icons/sidebar-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ProfileMenu } from "@/components/shared/sidebar/profile-menu";
import { routes } from "@/lib/routes";

export function HomeSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarHeader className="px-3 pt-3 pb-0">
        <ProfileMenu />
      </SidebarHeader>

      <SidebarContent className="pt-4">
        <SidebarGroup className="gap-1 px-3 pt-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem className="cursor-pointer">
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
              <SidebarMenuButton tooltip="Starred" size="sm">
                <Star className="size-4" />
                <span>Starred</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
