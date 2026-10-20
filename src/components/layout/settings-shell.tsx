"use client";

import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/icons/chevron-down";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, ChartColumn, Palette, SquareUser } from "lucide-react";
import { ImportIcon } from "@/components/icons/import-icon";
import { SecurityIcon } from "@/components/icons/security-icon";
import { FlameIcon } from "@/components/icons/flame-icon";
import { PersonalizationIcon } from "@/components/icons/personalization-icon";
import { ModelsIcon } from "@/components/icons/models-icon";
import { HotkeysIcon } from "@/components/icons/hotkeys-icon";
import { PreferencesIcon } from "@/components/icons/preferences-icon";
import { InviteIcon } from "@/components/icons/invite-icon";
import { UserAvatar } from "@/components/shared/user-avatar";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { navRow, navRowActive } from "@/components/layout/sidebar/nav-row";

/*
 * Settings shell, modelled on define.app's: the app sidebar gives way to
 * a settings nav (Back to app, grouped pages, What's new at the foot);
 * the page sits in the same inset panel as the rest of the app, named by
 * a tab drawn in the tab strip's hover style (a rounded pill, no join).
 * Grouped like Pond's (Personal / Workspace / Intelligence); pages that
 * need backend work are shown disabled with "Soon".
 */

const CHANGELOG_URL = "https://github.com/Oladejiraji/mindmap/commits/main";

const row = navRow;

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2.5 pb-1 text-body-sm text-fg-tertiary">{label}</p>
      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(row, active && navRowActive)}
    >
      {children}
    </Link>
  );
}

const PAGES: Record<string, { title: string; icon: ReactNode }> = {
  [routes.settingsAccount]: { title: "Account", icon: <UserAvatar size={16} /> },
  [routes.settingsPreferences]: { title: "Preferences", icon: <PreferencesIcon className="size-4 text-fg-secondary" /> },
  [routes.settingsHotkeys]: { title: "Hotkeys", icon: <HotkeysIcon className="size-4 text-fg-secondary" /> },
  [routes.settingsWorkspace]: { title: "Workspace", icon: <Building2 className="size-4 text-fg-secondary" /> },
  [routes.settingsTeams]: { title: "Teams", icon: <SquareUser className="size-4 text-fg-secondary" /> },
};

/* The current page as a tab in its hover style: a rounded pill on the
 * strip, not joined to the panel (so no seam line). */
function PageTab() {
  const page = PAGES[usePathname()];
  return (
    <div className="flex h-10 shrink-0 items-end">
      {page && (
        <div className="corner-squircle mb-1 flex h-8 w-42 items-center gap-2 rounded-xl bg-transparent-hover pl-3 text-body-sm text-fg-primary">
          {page.icon}
          <span className="truncate">{page.title}</span>
        </div>
      )}
    </div>
  );
}

/* A page that isn't available yet: muted, not a link, with a Soon tag. */
function Soon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span aria-disabled className={cn(row, "cursor-default text-fg-disabled hover:bg-transparent hover:text-fg-disabled [&>svg:first-child]:text-fg-disabled")}>
      {icon}
      {children}
      <span className="ml-auto rounded-md px-1.5 text-caption-base text-fg-tertiary inset-ring-[0.5px] inset-ring-border-default">Soon</span>
    </span>
  );
}

export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden bg-sidebar">
      <nav aria-label="Settings" className="flex w-56 shrink-0 flex-col px-3 pt-3 pb-4">
        <Link href={routes.home} className={cn(row, "mb-5 w-fit pr-3")}>
          <ChevronLeftIcon />
          Back to app
        </Link>

        <div className="flex flex-col gap-6">
          <NavGroup label="Personal">
            <NavLink href={routes.settingsAccount}>
              <UserAvatar size={16} />
              Account
            </NavLink>
            <NavLink href={routes.settingsPreferences}>
              <PreferencesIcon />
              Preferences
            </NavLink>
            <NavLink href={routes.settingsHotkeys}>
              <HotkeysIcon />
              Hotkeys
            </NavLink>
            <Soon icon={<Palette />}>Appearance</Soon>
          </NavGroup>

          <NavGroup label="Administration">
            <NavLink href={routes.settingsWorkspace}>
              <Building2 />
              Workspace
            </NavLink>
            <NavLink href={routes.settingsTeams}>
              <SquareUser />
              Teams
            </NavLink>
            <Soon icon={<InviteIcon />}>Members</Soon>
            <Soon icon={<SecurityIcon />}>Security</Soon>
            <Soon icon={<ChartColumn />}>Usage &amp; limits</Soon>
            <Soon icon={<ImportIcon />}>Import &amp; export</Soon>
          </NavGroup>

          <NavGroup label="Intelligence">
            {/* Model choice and custom instructions need backend support. */}
            <Soon icon={<ModelsIcon />}>Models</Soon>
            <Soon icon={<PersonalizationIcon />}>Personalization</Soon>
          </NavGroup>
        </div>

        <a href={CHANGELOG_URL} target="_blank" rel="noreferrer" className={cn(row, "mt-auto")}>
          <FlameIcon />
          What&apos;s new?
          <ArrowUpRight className="ml-auto size-4 text-fg-tertiary" />
        </a>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-1 pb-1">
        <PageTab />
        <main className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded-3xl bg-background bg-(image:--gradient-panel) shadow-default">
          {children}
        </main>
      </div>
    </div>
  );
}
