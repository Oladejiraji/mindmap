"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartyPopper, Plus, Search, SquarePen, Star } from "lucide-react";
import { HomeIcon, LogoIcon } from "@/components/icons/sidebar-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ProfileMenu } from "@/components/shared/sidebar/profile-menu";
import { SidebarToggleButton } from "@/components/shared/sidebar/sidebar-toggle-button";
import { CreateMenu } from "@/components/shared/sidebar/create-menu";
import { ProjectRow } from "@/components/shared/sidebar/project-row";
import { useThreads } from "@/services/threads/queries";
import { routes } from "@/lib/routes";

/*
 * App sidebar, structured like Pond's:
 *   header   logo tile + name · collapse toggle, new project (on the tab row);
 *            the 24px brand tile (14px m) centres over the nav icons
 *   nav      32px rows, 16px icon, 10px to the label, 13px text
 *   sections muted label with a trailing +, then its rows (Projects)
 *   footer   account, pinned bottom-left (no divider)
 * Collapses to a 48px icon rail; there the logo tile swaps to the toggle
 * on hover, and sections hide.
 */
// Rows: 32px, 13px labels; the active row is a raised white pill (define.app).
const row =
  "h-8 gap-2.5 text-body-sm font-semimedium data-active:bg-surface-container data-active:shadow-border data-active:hover:bg-surface-container";
const iconButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50";

export function HomeSidebar() {
  const pathname = usePathname();
  const { data: threads } = useThreads();
  const projects = threads?.slice(0, 12) ?? [];

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarHeader className="group/header h-10 flex-row items-center gap-0 py-0 pt-2 pr-3 pl-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href={routes.home}
          aria-label="Mindmap home"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:group-hover/header:hidden group-data-[collapsible=icon]:group-focus-within/header:hidden"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-solid text-on-brand-solid">
            <LogoIcon className="h-auto w-3.5" />
          </span>
          <span className="truncate text-body-base font-medium text-fg-primary group-data-[collapsible=icon]:hidden">Mindmap</span>
        </Link>
        <SidebarToggleButton className="group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover/header:flex group-data-[collapsible=icon]:group-focus-within/header:flex" />
        <CreateMenu label="Search" icon={<Search className="size-4" />} className="group-data-[collapsible=icon]:hidden" />
        <Link href={routes.newProject} aria-label="New chat" title="New chat" className={`${iconButton} group-data-[collapsible=icon]:hidden`}>
          <SquarePen className="size-4" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-6 pt-5">
        <SidebarGroup className="px-3 py-0 group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton isActive={pathname === routes.getStarted} tooltip="Get started" className={row} render={<Link href={routes.getStarted} />}>
                <PartyPopper className="size-4" />
                <span>Get started</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
          <div className="flex h-6 items-center justify-between pl-2">
            <span className="text-body-sm text-fg-tertiary">Projects</span>
            <span className="group/count flex items-center">
              <span className="pr-1.5 text-caption-lg text-fg-tertiary tabular-nums group-hover/count:hidden">{threads?.length ?? ""}</span>
              <Link href={routes.newProject} aria-label="New project" className={`${iconButton} hidden size-6 group-hover/count:flex`}>
                <Plus className="size-4" />
              </Link>
            </span>
          </div>
          <SidebarMenu className="gap-0.5">
            {projects.map((t) => (
              <ProjectRow key={t._id} thread={t} rowClassName={row} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mx-4 mb-4 px-0 pt-4 pb-0 group-data-[collapsible=icon]:mx-2">
        <ProfileMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
