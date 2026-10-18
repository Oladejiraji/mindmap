"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Star } from "lucide-react";
import { HomeIcon, LogoIcon } from "@/components/icons/sidebar-toggle";
import { CanvasIcon } from "@/components/icons/canvas-icon";
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
import { CreateMenu } from "@/components/shared/sidebar/create-menu";
import { useThreads } from "@/services/threads/queries";
import { routes } from "@/lib/routes";

/*
 * App sidebar, structured like Pond's:
 *   header   logo tile + name · collapse toggle, new project (on the tab row);
 *            the tile centres over the nav icons, the name on the nav labels
 *   nav      32px rows, 16px icon, 10px to the label, 13px text
 *   sections muted label with a trailing +, then its rows (Projects)
 *   footer   account, pinned bottom-left
 * Collapses to a 48px icon rail; there the logo tile swaps to the toggle
 * on hover, and sections hide.
 */
const row = "h-8 gap-2.5 text-body-sm font-semimedium";
const iconButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50";

export function HomeSidebar() {
  const pathname = usePathname();
  const { data: threads } = useThreads();
  const projects = threads?.slice(0, 12) ?? [];

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarHeader className="group/header h-10 flex-row items-center gap-0 py-0 pt-2 pr-3 pl-[18px] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href={routes.home}
          aria-label="Mindmap home"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:group-hover/header:hidden group-data-[collapsible=icon]:group-focus-within/header:hidden"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-inverted-solid text-on-inverted-fg">
            <LogoIcon className="h-1.75 w-auto" />
          </span>
          <span className="truncate text-body-base font-medium text-fg-primary group-data-[collapsible=icon]:hidden">Mindmap</span>
        </Link>
        <SidebarToggleButton className="group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover/header:flex group-data-[collapsible=icon]:group-focus-within/header:flex" />
        <CreateMenu className="group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="gap-6 pt-5">
        <SidebarGroup className="px-3 py-0 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname === routes.home} tooltip="Home" className={row} render={<Link href={routes.home} />}>
                <HomeIcon className="size-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Starred" className={row}>
                <Star className="size-4" />
                <span>Starred</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="px-3 py-0 group-data-[collapsible=icon]:hidden">
          <div className="flex h-7 items-center justify-between pl-2">
            <span className="text-body-sm text-fg-tertiary">Projects</span>
            <Link href={routes.newProject} aria-label="New project" className={iconButton}>
              <Plus className="size-4" />
            </Link>
          </div>
          <SidebarMenu className="gap-0.5">
            {projects.map((t) => (
              <SidebarMenuItem key={t._id}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(routes.thread(t._id))}
                  className={row}
                  render={<Link href={routes.thread(t._id)} />}
                >
                  <CanvasIcon className="size-4" />
                  <span>{t.name || "Untitled"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mx-4 mb-4 border-t border-border-default px-0 pt-4 pb-0 group-data-[collapsible=icon]:mx-2">
        <ProfileMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
