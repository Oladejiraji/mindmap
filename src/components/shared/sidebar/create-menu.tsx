"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { FolderIcon, FolderPlusIcon } from "@/components/icons/folder-icons";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { useThreads } from "@/services/threads/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/*
 * The sidebar header's "+" (modelled on Pond): a search field over a short
 * action list. "Open project ›" drills into the project list in place.
 * Typing filters projects; with no exact match it offers to create one
 * with that name. ↑/↓ move, ↵ picks.
 */

type Entry = { key: string; icon: React.ReactNode; label: React.ReactNode; chevron?: boolean; run: () => void };

export function CreateMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { data: threads } = useThreads();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"root" | "projects">("root");
  const [active, setActive] = useState(0);

  const close = () => setOpen(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const q = query.trim().toLowerCase();
  const projects = (threads ?? []).map((t) => ({
    key: t._id,
    icon: <CanvasIcon />,
    label: t.name || "Untitled",
    run: () => go(routes.thread(t._id)),
  }));

  let entries: Entry[];
  if (q) {
    const matches = projects.filter((p) => p.label.toLowerCase().includes(q));
    const exact = matches.some((p) => p.label.toLowerCase() === q);
    entries = [
      ...matches,
      ...(exact
        ? []
        : [{
            key: "create",
            icon: <FolderPlusIcon />,
            label: <>Create “{query.trim()}”</>,
            run: () => go(`${routes.newProject}?name=${encodeURIComponent(query.trim())}`),
          }]),
    ];
  } else if (view === "projects") {
    entries = projects;
  } else {
    entries = [
      { key: "new", icon: <FolderPlusIcon />, label: "New project", run: () => go(routes.newProject) },
      { key: "open", icon: <FolderIcon />, label: "Open project", chevron: true, run: () => { setView("projects"); setActive(0); } },
    ];
  }
  const current = Math.min(active, Math.max(entries.length - 1, 0));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(entries.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + entries.length) % Math.max(entries.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      entries[current]?.run();
    } else if ((e.key === "ArrowLeft" || e.key === "Backspace") && !query && view === "projects") {
      e.preventDefault();
      setView("root");
      setActive(0);
    } else if (e.key === "ArrowRight" && entries[current]?.chevron) {
      e.preventDefault();
      entries[current].run();
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setView("root");
          setActive(0);
        }
      }}
    >
      <Popover.Trigger
        aria-label="New"
        className={cn(
          "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover data-popup-open:text-fg-primary",
          className,
        )}
      >
        <Plus className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup
            initialFocus={false}
            className="w-64 origin-(--transform-origin) overflow-hidden rounded-xl bg-surface-modal text-body-base text-fg-primary shadow-large outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={view === "projects" ? "Search projects…" : "Search…"}
              aria-label="Search"
              className="h-9.5 w-full border-b border-border-default bg-transparent px-4 text-body-base text-fg-primary outline-none placeholder:text-fg-tertiary"
            />
            <div className="max-h-72 overflow-y-auto overscroll-contain p-1.5" role="listbox" aria-label="Actions">
              {view === "projects" && !q && (
                <button
                  type="button"
                  onClick={() => {
                    setView("root");
                    setActive(0);
                  }}
                  className="flex h-7 w-full cursor-pointer items-center gap-1 rounded-md px-2 text-body-sm text-fg-tertiary outline-none hover:text-fg-primary"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </button>
              )}
              {entries.map((entry, i) => (
                <button
                  key={entry.key}
                  type="button"
                  role="option"
                  aria-selected={i === current}
                  onMouseMove={() => setActive(i)}
                  onClick={entry.run}
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left outline-none [&>svg:first-child]:size-4 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-fg-tertiary",
                    i === current && "bg-transparent-hover",
                  )}
                >
                  {entry.icon}
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {entry.chevron && <ChevronRight className="size-3.5 shrink-0 text-fg-tertiary" />}
                </button>
              ))}
              {entries.length === 0 && <p className="px-2.5 py-2 text-body-sm text-fg-tertiary">No projects yet</p>}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
