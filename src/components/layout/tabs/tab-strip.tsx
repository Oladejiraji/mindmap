"use client";

import Link from "next/link";
import { MotionConfig, Reorder, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import type { Doc, Id } from "@convex/dataModel";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { RenderIf } from "@/components/shared/render-if";
import { renameThreadOptimistic, reorderTabsOptimistic, togglePinOptimistic } from "@/lib/optimistic";
import { Tab, pinnedTabBox, tabBox, type TabData } from "./tab";
import { TabSurface, useTabSurface } from "./tab-surface";
import { TabSearch } from "./tab-search";
import { EarlyTabClicksScript, useEarlyTabClicks } from "./early-tab-clicks";
import { useTabShortcuts } from "./use-tab-shortcuts";
import { useUnreadTabs } from "./use-unread-tabs";
import { tabHref } from "./tab-href";
import { useCloseTab } from "./use-close-tab";

/*
 * Browser-style tabs (after define.app): one per open project
 * (convex/tabs.ts). The active tab and the panel share one SVG surface.
 * × closes a tab (the project stays on Home); drag to reorder; double-click
 * the active tab to rename its project; right-click to rename or pin;
 * double-click empty space for a new project; the chevron on the left
 * searches open tabs (⌥ shortcuts in use-tab-shortcuts.ts; ←/→ move
 * between focused tabs). Tabs show a spinner while a
 * reply is written and a dot when one finished while you were away. On /new, a
 * temporary "New project" tab sits at the end.
 */

export type OpenTabs = FunctionReturnType<typeof api.tabs.list>;

export function TabStrip({ initialTabs }: { initialTabs?: OpenTabs }) {
  const pathname = usePathname();
  const router = useRouter();
  // A tab clicked while the page was still hydrating opens now.
  useEarlyTabClicks();
  // The server's list until the live query arrives, so the strip (and the
  // surface on the active tab) is there on first paint.
  const { data: liveTabs } = useAuthedConvexQuery(api.tabs.list, {});
  const openTabs = liveTabs ?? initialTabs;
  const reorderTabs = useMutation(api.tabs.reorder).withOptimisticUpdate(reorderTabsOptimistic);
  const { close: closeById, reopenLast } = useCloseTab(openTabs);
  const close = (thread: Doc<"threads">) => closeById(thread._id);

  const togglePin = useMutation(api.tabs.togglePin).withOptimisticUpdate(togglePinOptimistic);
  const renameThread = useMutation(api.threads.rename).withOptimisticUpdate(
    renameThreadOptimistic,
  );
  // The tab being renamed (double-click the active tab).
  const [editingId, setEditingId] = useState<Id<"threads"> | null>(null);

  // While dragging, the order lives here; on release it's saved, and the
  // optimistic update keeps it in place until the server agrees.
  const [dragOrder, setDragOrder] = useState<Id<"threads">[] | null>(null);
  const serverOrder = (openTabs ?? []).map(({ thread }) => thread._id);
  const order = dragOrder ?? serverOrder;
  const byId = new Map(
    (openTabs ?? []).map((t) => [t.thread._id as string, t]),
  );
  const tabs = order.flatMap(
    (id): (TabData & { path: string; thread: Doc<"threads">; pinned: boolean })[] => {
      const open = byId.get(id);
      return open
        ? [
            {
              // The tab links back to where you last were in the project;
              // `path` (no query) is what's matched against the page.
              href: tabHref(open),
              path: routes.thread(id),
              title: open.thread.name || "Untitled",
              thread: open.thread,
              pinned: open.pinned,
            },
          ]
        : [];
    },
  );
  // Dragging can't move a tab across the pinned / unpinned boundary.
  const keepPinnedFirst = (ids: Id<"threads">[]) => [
    ...ids.filter((id) => byId.get(id)?.pinned),
    ...ids.filter((id) => !byId.get(id)?.pinned),
  ];
  const activeIndex = tabs.findIndex((t) => t.path === pathname);
  const activeId = tabs[activeIndex]?.thread._id as string | undefined;

  const unread = useUnreadTabs(tabs, activeId);
  const onNewProject = pathname === routes.newProject;
  // + remembers the tab it was opened from (?from=), so closing "New
  // project" goes back there, like a browser.
  const activeThread = tabs[activeIndex]?.thread;
  const newProjectHref = activeThread
    ? `${routes.newProject}?from=${activeThread._id}`
    : routes.newProject;
  // Back to the tab it was opened from, else the last tab, else Home.
  const closeNewProject = () => {
    const from = new URLSearchParams(window.location.search).get("from");
    const back = tabs.find((t) => t.thread._id === from) ?? tabs.at(-1);
    router.push(back?.href ?? routes.home);
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const goTo = (i: number) => {
    const tab = i < 0 ? tabs.at(-1) : tabs[i];
    if (tab) router.push(tab.href);
  };
  useTabShortcuts({
    goTo,
    step: (direction) => {
      if (!tabs.length) return;
      // From "New project" (or a page without a tab), step from the ends.
      const from = activeIndex < 0 ? (direction > 0 ? -1 : tabs.length) : activeIndex;
      goTo((from + direction + tabs.length) % tabs.length);
    },
    newProject: () => router.push(newProjectHref),
    closeCurrent: () => {
      if (onNewProject) closeNewProject();
      else if (activeThread && !tabs[activeIndex]?.pinned) void close(activeThread);
    },
    reopenClosed: () => void reopenLast(),
    openSearch: () => setSearchOpen(true),
  });

  // Keyboard focus inside the strip: only one tab is in the Tab order (the
  // active one); arrows move between tabs, F2 renames, Delete closes.
  const onStripKeyDown = (e: React.KeyboardEvent) => {
    const links = [...(scrollerRef.current?.querySelectorAll<HTMLElement>('a[role="tab"]') ?? [])];
    const i = links.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const focusAt = (n: number) => links[(n + links.length) % links.length]?.focus();
    const tab = tabs.find((t) => t.href === links[i].getAttribute("href"));
    if (e.key === "ArrowRight") focusAt(i + 1);
    else if (e.key === "ArrowLeft") focusAt(i - 1);
    else if (e.key === "Home") focusAt(0);
    else if (e.key === "End") focusAt(links.length - 1);
    else if (e.key === "F2" && tab) setEditingId(tab.thread._id);
    else if ((e.key === "Delete" || e.key === "Backspace") && tab && !tab.pinned) {
      void close(tab.thread);
      focusAt(i < links.length - 1 ? i + 1 : i - 1);
    } else return;
    e.preventDefault();
  };

  const saveOrder = () => {
    if (dragOrder && dragOrder.join() !== serverOrder.join()) {
      reorderTabs({ threadIds: dragOrder }).catch((err) =>
        handleError(err, "Couldn't move the tab"),
      );
    }
    setDragOrder(null);
  };

  const scrollerRef = useRef<HTMLDivElement>(null);
  const { stripRef, place, following, startFollowing, stopFollowing, surface } =
    useTabSurface(scrollerRef);
  // A click that ends a drag shouldn't open the tab.
  const dragged = useRef(false);
  const draggedBox = useRef<HTMLElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /** The tab under the pointer, which may be about to be dragged. */
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Keeps the active tab visible when the strip scrolls sideways.
  const revealActive = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <>
    <MotionConfig reducedMotion="user">
      <div
        ref={stripRef}
        // pl-2: the chevron and tabs start a little in from the panel's left edge.
        className="relative flex h-11 shrink-0 items-end gap-1 pl-2 max-md:hidden"
      >
        <TabSurface {...surface} />
        <TabSearch
          tabs={tabs}
          activeHref={pathname}
          onClose={(thread) => void close(thread)}
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
        <motion.div
          ref={scrollerRef}
          role="tablist"
          aria-label="Open tabs"
          onScroll={() => place("jump")}
          onKeyDown={onStripKeyDown}
          // Double-click empty strip space for a new project, like a browser.
          onDoubleClick={(e) =>
            (e.target === e.currentTarget ||
              e.target === e.currentTarget.firstElementChild) &&
            router.push(newProjectHref)
          }
          className="relative flex h-full min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none]"
        >
          {/* Fills the strip. Tabs shrink to fit it and overflow it (the
              strip scrolls) at their minimum; + sits right after the last tab. */}
          <Reorder.Group
            as="div"
            role="presentation"
            axis="x"
            values={order}
            onReorder={(ids) => setDragOrder(keepPinnedFirst(ids))}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            {tabs.map((tab, i) => {
              const active = i === activeIndex;
              const editing = editingId === tab.thread._id;
              return (
                <Reorder.Item
                  as="div"
                  key={tab.path}
                  value={tab.thread._id}
                  // No dragging while typing a new name.
                  dragListener={!editing}
                  ref={active ? revealActive : undefined}
                  data-tab-box
                  data-tab-active={active || undefined}
                  onPointerDown={() => {
                    dragged.current = false;
                    setPressedId(tab.thread._id);
                  }}
                  onPointerUp={() => !draggingId && setPressedId(null)}
                  onDragStart={(e) => {
                    dragged.current = true;
                    // Dragging a tab opens it, so the surface follows it too.
                    const box = (e.target as HTMLElement).closest<HTMLElement>(
                      "[data-tab-box]",
                    );
                    draggedBox.current = box;
                    if (box) startFollowing(box);
                    if (!active) router.push(tab.href);
                    setDraggingId(tab.thread._id);
                    setDragOrder(order);
                  }}
                  onDrag={() => following.current && place("jump")}
                  onDragEnd={() => {
                    if (draggedBox.current) stopFollowing(draggedBox.current);
                    setDraggingId(null);
                    setPressedId(null);
                    saveOrder();
                  }}
                  whileDrag={{ zIndex: 20 }}
                  // Snap into the slot on drop, like rndr-ai-demo: no throw
                  // momentum, and a stiff spring instead of Motion's soft default.
                  dragMomentum={false}
                  // Stay inside the scroller: past its edge (e.g. over the
                  // search button) the tab's contents would be clipped while
                  // its surface isn't. Only for the tab being pressed: with a
                  // ref here from the start, Motion watches the strip's size
                  // and shifts every tab when it changes (e.g. the side panel
                  // opening), leaving them squished.
                  dragConstraints={pressedId === tab.thread._id ? scrollerRef : undefined}
                  dragElastic={0}
                  dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
                  // Tabs making room move with the same spring.
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 40,
                    mass: 0.8,
                  }}
                  // Full width while renaming, so you can see what you type.
                  className={cn(
                    tabBox,
                    tab.pinned && !editing && pinnedTabBox,
                    editing && "min-w-42",
                  )}
                >
                  <Tab
                    tab={tab}
                    active={active}
                    focusable={active || (activeIndex < 0 && !onNewProject && i === 0)}
                    divider={i > 0 && !active && i - 1 !== activeIndex}
                    onClose={() => void close(tab.thread)}
                    onClick={(e) => dragged.current && e.preventDefault()}
                    editing={editing}
                    pinned={tab.pinned}
                    replying={(tab.thread.replying ?? 0) > 0}
                    unread={!active && unread.has(tab.thread._id)}
                    dragging={draggingId === tab.thread._id}
                    onTogglePin={() =>
                      togglePin({ threadId: tab.thread._id }).catch((err) =>
                        handleError(err, "Couldn't pin the tab"),
                      )
                    }
                    onEditingChange={(on) =>
                      setEditingId(on ? tab.thread._id : null)
                    }
                    onRename={(name) =>
                      renameThread({ threadId: tab.thread._id, name }).catch(
                        (err) =>
                          handleError(err, "Couldn't rename the project"),
                      )
                    }
                  />
                </Reorder.Item>
              );
            })}
          <RenderIf condition={onNewProject}>
            <div
              ref={revealActive}
              data-tab-active
              className={cn(tabBox, "z-10")}
            >
              <Tab
                tab={{ href: routes.newProject, title: "New project" }}
                active
                focusable
                divider={false}
                onClose={closeNewProject}
              />
            </div>
          </RenderIf>
          <Link
            href={newProjectHref}
            aria-label="New project"
            className="relative mb-1 ml-1 flex size-7 shrink-0 items-center justify-center self-end rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" />
          </Link>
          </Reorder.Group>
        </motion.div>
      </div>
    </MotionConfig>
    {/* Right after the strip, so it can find it and runs before hydration. */}
    <EarlyTabClicksScript />
    </>
  );
}
