"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { HomeIcon } from "@/components/icons/sidebar-toggle";
import { Logo } from "@/components/icons/logo";
import { LogoIcon } from "@/components/icons/sidebar-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ProfileMenu } from "@/components/shared/sidebar/profile-menu";
import { SidebarToggleButton } from "@/components/shared/sidebar/sidebar-toggle-button";
import { routes } from "@/lib/routes";

/*
 * Shell layout follows design.interfere.com: 280px sidebar with 16px side
 * padding. The header shares the tab strip's row: logo left, collapse
 * toggle right. Collapsed, the rail shows the logo and swaps it for the
 * toggle on hover. 28px nav rows 2px apart, and the account control
 * pinned bottom-left under a divider. Collapses to a 48px icon rail.
 */
export function HomeSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarHeader className="group/header h-10 flex-row items-center justify-between gap-0 py-0 pt-1 pr-3 pl-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href={routes.home}
          aria-label="Mindmap home"
          className="flex h-5 w-fit items-center rounded-sm text-fg-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]:group-hover/header:hidden group-data-[collapsible=icon]:group-focus-within/header:hidden"
        >
          <Logo className="h-3.5 w-auto group-data-[collapsible=icon]:hidden" color="currentColor" />
          <LogoIcon className="hidden h-2.5 w-auto group-data-[collapsible=icon]:block" />
        </Link>
        <SidebarToggleButton className="group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover/header:flex group-data-[collapsible=icon]:group-focus-within/header:flex" />
      </SidebarHeader>

      <SidebarContent className="pt-[34px]">
        <SidebarGroup className="px-4 py-0 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="gap-0.5">
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
              <SidebarMenuButton tooltip="Starred" size="sm">
                <Star className="size-4" />
                <span>Starred</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mx-4 mb-4 border-t border-border-default px-0 pt-4 pb-0 group-data-[collapsible=icon]:mx-2">
        <ProfileMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
