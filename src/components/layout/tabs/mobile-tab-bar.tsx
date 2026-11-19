"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { renameThreadOptimistic } from "@/lib/optimistic";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { routes } from "@/lib/routes";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { RenderIf } from "@/components/shared/render-if";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import { cn } from "@/lib/utils";
import type { OpenTabs } from "./tab-strip";
import { TabSwitcher } from "./tab-switcher";
import { useUnreadTabs } from "./use-unread-tabs";
import { useCloseTab, useClosedTabs } from "./use-close-tab";

/*
 * The tab strip on phones: the sidebar button, the project you're on (tap
 * to rename) and a button with how many tabs are open, which opens the tab
 * switcher. Shown below the md breakpoint, where the strip is hidden.
 */

// Must match MAX_TITLE in convex/lib/validation.ts.
const MAX_TITLE = 120;
export function MobileTabBar({ initialTabs }: { initialTabs?: OpenTabs }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const { data: liveTabs } = useAuthedConvexQuery(api.tabs.list, {});
  const tabs = liveTabs ?? initialTabs;
  const onNewProject = pathname === routes.newProject;
  const activeTab = tabs?.find((t) => routes.thread(t.thread._id) === pathname);
  const activeId = activeTab?.thread._id;
  // The page a switcher card is taking you to, until the address gets
  // there: the title shows it from the tap, not the old page's.
  const [goingTo, setGoingTo] = useState<string | null>(null);
  if (goingTo === pathname) setGoingTo(null);
  const shownPath = goingTo ?? pathname;
  const title =
    shownPath === routes.newProject
      ? "New project"
      : tabs?.find((t) => routes.thread(t.thread._id) === shownPath)?.thread.name || undefined;
  const unread = useUnreadTabs(tabs ?? [], activeId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // The switcher gets a history entry of its own, so the phone's back
  // gesture closes it instead of leaving the page.
  const openSwitcher = () => {
    window.history.pushState({ tabSwitcher: true }, "");
    setSwitcherOpen(true);
  };
  const onSwitcherOpenChange = (open: boolean) => {
    setSwitcherOpen(open);
    // Closed in place (Done, Esc): drop its entry. After a card's link
    // navigated, the entry on top is the new page's, so it stays.
    if (!open && window.history.state?.tabSwitcher) window.history.back();
  };
  // Back while it's open closes it. Subscribing to a browser event.
  useEffect(() => {
    if (!switcherOpen) return;
    const onBack = () => setSwitcherOpen(false);
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [switcherOpen]);

  const renameThread = useMutation(api.threads.rename).withOptimisticUpdate(renameThreadOptimistic);
  const [renaming, setRenaming] = useState(false);
  const canRename = !!activeTab && !goingTo;
  const rename = (name: string) => {
    setRenaming(false);
    const next = name.trim();
    if (!activeTab || !next || next === activeTab.thread.name) return;
    renameThread({ threadId: activeTab.thread._id, name: next }).catch((err) =>
      handleError(err, "Couldn't rename the project"),
    );
  };
  // Cancelling with Esc mustn't also save on the blur that follows.
  const cancelled = useRef(false);

  // Another tab writing a reply, or with one you haven't seen.
  const othersReplying = (tabs ?? []).some((t) => t.thread._id !== activeId && (t.thread.replying ?? 0) > 0);
  const othersUnread = unread.size > 0;
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
        <RenderIf condition={!!title && renaming}>
          <input
            autoFocus
            defaultValue={title}
            maxLength={MAX_TITLE}
            aria-label="Project name"
            onFocus={(e) => {
              cancelled.current = false;
              e.currentTarget.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelled.current = true;
                setRenaming(false);
              }
            }}
            onBlur={(e) => !cancelled.current && rename(e.currentTarget.value)}
            className="h-7 w-full rounded-lg bg-component px-1.5 -mx-1.5 text-body-sm font-medium text-fg-primary outline-none"
          />
        </RenderIf>
        <RenderIf condition={!!title && !renaming}>
          <button
            onClick={() => canRename && setRenaming(true)}
            disabled={!canRename}
            aria-label={canRename ? `Rename ${title}` : undefined}
            className="block h-7 max-w-full cursor-pointer truncate rounded-lg text-left text-body-sm font-medium text-fg-primary outline-none disabled:cursor-default focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {title}
          </button>
        </RenderIf>
        {/* Until the tabs arrive (or the page's tab is added). */}
        <RenderIf condition={!title}>
          <Skeleton className="h-4 w-32 bg-component-hover" />
        </RenderIf>
      </div>
      <button
        onClick={openSwitcher}
        aria-label={`Open tabs (${count})${othersUnread ? ", new replies" : othersReplying ? ", replies being written" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={switcherOpen}
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-fg-secondary outline-none transition-colors active:bg-transparent-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* A rounded square with the count, like a phone browser's tab button. */}
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] border-[1.5px] border-current px-0.5 text-[10px] leading-none font-semibold tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
        {/* Like the tabs' own: a dot for a new reply, pulsing while one is written. */}
        <RenderIf condition={othersUnread || othersReplying}>
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 right-1.5 size-1.5 rounded-full ring-2 ring-sidebar",
              othersUnread ? "bg-brand-solid" : "bg-fg-tertiary motion-safe:animate-pulse",
            )}
          />
        </RenderIf>
      </button>
      <TabSwitcher
        open={switcherOpen}
        onOpenChange={onSwitcherOpenChange}
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
        onNavigate={(path) => setGoingTo(path === pathname ? null : path)}
      />
    </div>
  );
}
