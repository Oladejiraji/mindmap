"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { PartyPopper, Plus, Search } from "lucide-react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { FolderPlusIcon } from "@/components/icons/folder-icons";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { BranchNodeIcon } from "@/components/icons/node-icons";
import { useThreads } from "@/services/threads/queries";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";
import { popupMotion } from "./popover-styles";

/*
 * Search popover, laid out like define.app's: a grey search pill on top,
 * then grouped results with muted headers and two-line rows (title +
 * muted subtitle) behind an icon tile.
 *   Actions   New chat, Get started
 *   Projects  name · "Project · 2d ago"
 *   Nodes     (on a project page) title · its path; opens the node panel
 * Typing filters every group; with no hits it offers to start a chat with
 * the text. ↑/↓ move, ↵ picks.
 */

type Entry = { key: string; icon: ReactNode; title: ReactNode; subtitle?: string; run: () => void };
type Group = { label: string; entries: Entry[] };

export function CreateMenu({
  className,
  icon = <Plus className="size-4" />,
  label = "New",
}: {
  className?: string;
  /** Trigger glyph; the sidebar header uses a search icon. */
  icon?: ReactNode;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: threads } = useThreads();
  const threadId = pathname.match(/^\/t\/([^/?]+)/)?.[1] as Id<"threads"> | undefined;
  // "skip" outside a project page (the hook passes args straight to Convex).
  const { data: nodes } = useAuthedConvexQuery(
    api.nodes.listByThread,
    (threadId ? { threadId } : "skip") as { threadId: Id<"threads"> },
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const currentThread = threads?.find((t) => t._id === threadId);

  const actions: Entry[] = [
    { key: "new", icon: <FolderPlusIcon />, title: "New chat", subtitle: "Start a project from a question", run: () => go(routes.newProject) },
    { key: "start", icon: <PartyPopper />, title: "Get started", subtitle: "How Mindmap works", run: () => go(routes.getStarted) },
  ].filter((a) => matches(a.title));

  const projects: Entry[] = (threads ?? [])
    .filter((t) => matches(t.name || "Untitled"))
    .slice(0, q ? 8 : 5)
    .map((t) => ({
      key: t._id,
      icon: <NodeTabIcon />,
      title: t.name || "Untitled",
      subtitle: `Project · ${formatRelativeTime(t.updatedAt ?? t._creationTime)}`,
      run: () => go(routes.thread(t._id)),
    }));

  const nodeMap = nodes ? buildNodeMap(nodes) : null;
  const nodeEntries: Entry[] =
    nodes && nodeMap && threadId
      ? nodes
          .filter((n) => n.parentId !== null && matches(n.title))
          .slice(0, q ? 8 : 5)
          .map((n) => ({
            key: n._id,
            icon: <BranchNodeIcon />,
            title: n.title,
            subtitle: [currentThread?.name ?? "Project", ...walkAncestors(nodeMap, n._id).slice(1, -1).map((a) => a.title)].join(" / "),
            run: () => go(routes.node(threadId, n._id)),
          }))
      : [];

  const groups: Group[] = [
    { label: "Actions", entries: actions },
    { label: "Projects", entries: projects },
    { label: "Nodes", entries: nodeEntries },
  ].filter((g) => g.entries.length > 0);

  if (q && groups.length === 0) {
    groups.push({
      label: "Actions",
      entries: [
        {
          key: "start-chat",
          icon: <FolderPlusIcon />,
          title: <>Start a chat: “{query.trim()}”</>,
          subtitle: "New project",
          run: () => go(`${routes.newProject}?name=${encodeURIComponent(query.trim())}`),
        },
      ],
    });
  }

  const flat = groups.flatMap((g) => g.entries);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[current]?.run();
    }
  };

  let index = -1;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <Tip label={label}>
        <Popover.Trigger
          aria-label={label}
          className={cn(
            "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover data-popup-open:text-fg-primary",
            className,
          )}
        >
          {icon}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup
            initialFocus={false}
            className={cn("corner-squircle w-80 overflow-hidden rounded-4xl bg-surface-modal text-fg-primary shadow-large outline-none", popupMotion, "data-starting-style:scale-100 data-starting-style:opacity-100")}
          >
            <div className="border-b border-border-subtle p-1.5">
              <label className="corner-squircle flex h-9.5 items-center gap-2 rounded-[14px] bg-component px-3">
                <Search className="size-4 shrink-0 text-fg-tertiary" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search"
                  aria-label="Search"
                  className="min-w-0 flex-1 bg-transparent text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
                />
              </label>
            </div>
            <div className="max-h-96 overflow-y-auto overscroll-contain p-1.5" role="listbox" aria-label="Results">
              {groups.map((group) => (
                <div key={group.label} role="group" aria-label={group.label} className="pb-1">
                  <p className="px-2.5 pt-2.5 pb-1.5 text-caption-lg text-fg-tertiary">{group.label}</p>
                  {group.entries.map((entry) => {
                    index += 1;
                    const i = index;
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        role="option"
                        aria-selected={i === current}
                        onMouseMove={() => setActive(i)}
                        onClick={entry.run}
                        className={cn(
                          "corner-squircle flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 py-2 text-left outline-none",
                          i === current && "bg-transparent-hover",
                        )}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-component text-fg-tertiary [&_svg]:size-4">
                          {entry.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-fg-primary">{entry.title}</span>
                          {entry.subtitle && (
                            <span className="block truncate text-caption-lg text-fg-tertiary">{entry.subtitle}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
