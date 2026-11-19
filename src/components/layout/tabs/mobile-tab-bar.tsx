"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { routes } from "@/lib/routes";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { RenderIf } from "@/components/shared/render-if";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import type { OpenTabs } from "./tab-strip";
import { TabSwitcher } from "./tab-switcher";
import { useUnreadTabs } from "./use-unread-tabs";
import { useCloseTab, useClosedTabs } from "./use-close-tab";

/*
 * The tab strip on phones: the sidebar button, the project you're on and
 * a button with how many tabs are open, which opens the tab switcher.
 * Shown below the md breakpoint, where the strip is hidden.
 */
export function MobileTabBar({ initialTabs }: { initialTabs?: OpenTabs }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { data: liveTabs } = useAuthedConvexQuery(api.tabs.list, {});
  const tabs = liveTabs ?? initialTabs;
  const onNewProject = pathname === routes.newProject;
  const activeTab = tabs?.find((t) => routes.thread(t.thread._id) === pathname);
  const activeId = activeTab?.thread._id;
  const title = onNewProject ? "New project" : activeTab?.thread.name || undefined;
  const unread = useUnreadTabs(tabs ?? [], activeId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { close, restore, reopen } = useCloseTab(tabs);
  const closedTabs = useClosedTabs()
    .filter((c) => !tabs?.some((t) => t.thread._id === c.thread._id))
    .toReversed()
    .slice(0, 5);
  // Remembers the tab it was opened from, so closing New project goes back there.
  const newProjectHref = activeId ? `${routes.newProject}?from=${activeId}` : routes.newProject;
  // Closing from the switcher offers Undo, which puts the tab back in its place.
  const closeWithUndo = (tab: OpenTabs[number]) => {
    const order = (tabs ?? []).map((t) => t.thread._id);
    void close(tab.thread._id);
    toast(`Closed ${tab.thread.name || "Untitled"}`, {
      action: { label: "Undo", onClick: () => restore(tab, order) },
    });
  };
  // The New project page counts as a tab, as it does in the strip.
  const count = (tabs?.length ?? 0) + (onNewProject ? 1 : 0);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 px-1 md:hidden">
      <button
        onClick={toggleSidebar}
        aria-label="Open sidebar"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-fg-tertiary outline-none transition-colors active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <SidebarToggleIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1 px-1">
        <RenderIf condition={!!title}>
          <p className="truncate text-body-sm font-medium text-fg-primary">{title}</p>
        </RenderIf>
        {/* Until the tabs arrive (or the page's tab is added). */}
        <RenderIf condition={!title}>
          <Skeleton className="h-4 w-32 bg-component-hover" />
        </RenderIf>
      </div>
      <button
        onClick={() => setSwitcherOpen(true)}
        aria-label={`Open tabs (${count})`}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-fg-secondary outline-none transition-colors active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* A rounded square with the count, like a phone browser's tab button. */}
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] border-[1.5px] border-current px-0.5 text-[10px] leading-none font-semibold tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      </button>
      <TabSwitcher
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
        tabs={tabs ?? []}
        activeId={activeId}
        onNewProject={onNewProject}
        unread={unread}
        onClose={closeWithUndo}
        closed={closedTabs}
        onReopen={(tab) =>
          void reopen(tab).then((ok) => {
            if (!ok) toast("That project was deleted");
          })
        }
        newProjectHref={newProjectHref}
      />
    </div>
  );
}
