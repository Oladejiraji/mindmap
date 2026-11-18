"use client";

import Link from "next/link";
import { MotionConfig, Reorder, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import type { Doc, Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { handleError } from "@/lib/handle-error";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { RenderIf } from "@/components/shared/render-if";
import { renameThreadOptimistic } from "@/lib/optimistic";
import { Tab, pinnedTabBox, tabBox, type TabData } from "./tab";
import { TabSurface, useTabSurface } from "./tab-surface";
import { TabSearch } from "./tab-search";

/*
 * Browser-style tabs (after define.app): one per open project
 * (convex/tabs.ts). The active tab and the panel share one SVG surface.
 * × closes a tab (the project stays on Home); drag to reorder; double-click
 * the active tab to rename its project; right-click to rename or pin;
 * double-click empty space for a new project; the chevron on the left
 * searches open tabs. Tabs show a spinner while a
 * reply is written and a dot when one finished while you were away. On /new, a
 * temporary "New project" tab sits at the end.
 */

export function TabStrip() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: openTabs } = useAuthedConvexQuery(api.tabs.list, {});
  const closeTab = useMutation(api.tabs.close).withOptimisticUpdate(
    (store, { threadId }) => {
      const open = store.getQuery(api.tabs.list, {});
      if (open)
        store.setQuery(
          api.tabs.list,
          {},
          open.filter((t) => t.thread._id !== threadId),
        );
    },
  );
  // Same ordering as the server: listed tabs first, the rest after in their old order.
  const reorderTabs = useMutation(api.tabs.reorder).withOptimisticUpdate(
    (store, { threadIds }) => {
      const open = store.getQuery(api.tabs.list, {});
      if (!open) return;
      const rank = new Map(threadIds.map((id, i) => [id as string, i]));
      const at = (t: (typeof open)[number], i: number) =>
        rank.get(t.thread._id) ?? threadIds.length + i;
      store.setQuery(
        api.tabs.list,
        {},
        open
          .map((t, i) => [at(t, i), t] as const)
          .sort(([a], [b]) => a - b)
          .map(([, t]) => t),
      );
    },
  );

  // Same as the server: the tab lands between the other pinned tabs and the rest.
  const togglePin = useMutation(api.tabs.togglePin).withOptimisticUpdate(
    (store, { threadId }) => {
      const open = store.getQuery(api.tabs.list, {});
      const tab = open?.find((t) => t.thread._id === threadId);
      if (!open || !tab) return;
      const others = open.filter((t) => t !== tab);
      store.setQuery(api.tabs.list, {}, [
        ...others.filter((t) => t.pinned),
        { ...tab, pinned: !tab.pinned },
        ...others.filter((t) => !t.pinned),
      ]);
    },
  );
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
    (id): (TabData & { thread: Doc<"threads">; pinned: boolean })[] => {
      const open = byId.get(id);
      return open
        ? [
            {
              href: routes.thread(id),
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
  const activeIndex = tabs.findIndex((t) => t.href === pathname);
  const activeId = tabs[activeIndex]?.thread._id as string | undefined;

  // Unread: a reply finished in a project while you were on another tab.
  // Worked out during render from each project's reply count; kept for
  // this session only.
  const replyingNow = tabs
    .filter((t) => (t.thread.replying ?? 0) > 0)
    .map((t) => t.thread._id as string);
  const [wasReplying, setWasReplying] = useState<string[]>([]);
  const [unread, setUnread] = useState<ReadonlySet<string>>(new Set());
  if (replyingNow.join() !== wasReplying.join()) {
    const finished = wasReplying.filter(
      (id) => !replyingNow.includes(id) && id !== activeId && byId.has(id),
    );
    setWasReplying(replyingNow);
    if (finished.length) setUnread((prev) => new Set([...prev, ...finished]));
  }
  // Opening the tab reads it.
  if (activeId && unread.has(activeId)) {
    setUnread((prev) => new Set([...prev].filter((id) => id !== activeId)));
  }
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

  const close = async (thread: Doc<"threads">) => {
    const href = routes.thread(thread._id);
    // Closing the tab you're on: go to the next tab (or the previous one
    // at the end), like a browser; with none left, Home.
    if (pathname === href) {
      const i = tabs.findIndex((t) => t.href === href);
      router.push((tabs[i + 1] ?? tabs[i - 1])?.href ?? routes.home);
    }
    try {
      await closeTab({ threadId: thread._id });
    } catch (err) {
      handleError(err, "Couldn't close the tab");
    }
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

  // Keeps the active tab visible when the strip scrolls sideways.
  const revealActive = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={stripRef}
        className="relative flex h-11 shrink-0 items-end gap-1"
      >
        <TabSurface {...surface} />
        <TabSearch
          tabs={tabs}
          activeHref={pathname}
          onClose={(thread) => void close(thread)}
        />
        <motion.div
          ref={scrollerRef}
          layoutScroll
          role="tablist"
          aria-label="Open tabs"
          onScroll={() => place("jump")}
          // Double-click empty strip space for a new project, like a browser.
          onDoubleClick={(e) =>
            e.target === e.currentTarget && router.push(newProjectHref)
          }
          className="relative flex h-full min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none]"
        >
          {/* Only as wide as its tabs (shrinking with them), so + follows the last tab. */}
          <Reorder.Group
            as="div"
            role="presentation"
            axis="x"
            values={order}
            onReorder={(ids) => setDragOrder(keepPinnedFirst(ids))}
            className="flex h-full items-end"
          >
            {tabs.map((tab, i) => {
              const active = i === activeIndex;
              const editing = editingId === tab.thread._id;
              return (
                <Reorder.Item
                  as="div"
                  key={tab.href}
                  value={tab.thread._id}
                  // No dragging while typing a new name.
                  dragListener={!editing}
                  ref={active ? revealActive : undefined}
                  data-tab-box
                  data-tab-active={active || undefined}
                  onPointerDown={() => (dragged.current = false)}
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
                    saveOrder();
                  }}
                  whileDrag={{ zIndex: 20 }}
                  // Snap into the slot on drop, like rndr-ai-demo: no throw
                  // momentum, and a stiff spring instead of Motion's soft default.
                  dragMomentum={false}
                  // Stay inside the scroller: past its edge (e.g. over the
                  // search button) the tab's contents would be clipped while
                  // its surface isn't.
                  dragConstraints={scrollerRef}
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
          </Reorder.Group>
          <RenderIf condition={onNewProject}>
            <div
              ref={revealActive}
              data-tab-active
              className={cn(tabBox, "z-10")}
            >
              <Tab
                tab={{ href: routes.newProject, title: "New project" }}
                active
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
        </motion.div>
      </div>
    </MotionConfig>
  );
}
