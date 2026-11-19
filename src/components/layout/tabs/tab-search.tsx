"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Search } from "lucide-react";
import type { Doc } from "@convex/dataModel";
import { CloseIcon } from "@/components/icons/close-icon";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { RenderIf } from "@/components/shared/render-if";
import { formatRelativeTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

type SearchTab = {
  href: string;
  /** The project's path without the saved query, matched against the page. */
  path: string;
  title: string;
  thread: Doc<"threads">;
  pinned: boolean;
};

/*
 * The chevron left of the tabs (after rndr-ai-demo): a list of your open
 * tabs, filtered as you type. ↑/↓ move the highlight, Enter opens it,
 * Esc closes. × on a row closes that tab (not pinned ones). Opens with ⌥K.
 */
export function TabSearch({
  tabs,
  activeHref,
  onClose,
  open,
  onOpenChange,
}: {
  tabs: SearchTab[];
  activeHref: string;
  onClose: (thread: Doc<"threads">) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  // Start fresh each time it opens (by click or ⌥K), on the tab you're on.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setHighlight(Math.max(tabs.findIndex((t) => t.path === activeHref), 0));
    }
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const results = q
    ? tabs.filter((t) => t.title.toLowerCase().includes(q))
    : tabs;
  const current = Math.min(highlight, Math.max(results.length - 1, 0));

  const openTab = (tab: SearchTab) => {
    onOpenChange(false);
    router.push(tab.href);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Popover.Trigger
        aria-label="Search tabs"
        aria-keyshortcuts="Alt+K"
        className="relative  mb-1 flex size-8 shrink-0 cursor-pointer items-center justify-center self-end rounded-xl bg-component text-fg-tertiary outline-none transition-colors hover:bg-component-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-component-active data-popup-open:text-fg-primary"
      >
        <ChevronDown className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={10}
          alignOffset={4}
          className="z-50"
        >
          <Popover.Popup
            initialFocus={inputRef}
            className="corner-squircle w-72 origin-(--transform-origin) rounded-4xl bg-surface-modal p-1.5 shadow-large outline-none transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-opacity"
          >
            <div className="flex items-center gap-2 px-2.5 pt-1 pb-2">
              <Search className="size-3.5 shrink-0 text-fg-tertiary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight(Math.min(current + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight(Math.max(current - 1, 0));
                  } else if (e.key === "Enter" && results[current]) {
                    e.preventDefault();
                    openTab(results[current]);
                  }
                }}
                placeholder="Search tabs…"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={
                  results[current] ? `${listId}-${current}` : undefined
                }
                className="min-w-0 flex-1 bg-transparent text-body-sm text-fg-primary outline-none placeholder:text-fg-tertiary"
              />
            </div>

            <p className="px-2.5 pt-1 pb-1.5 text-caption-lg text-fg-tertiary">
              Open tabs
            </p>
            <RenderIf condition={results.length === 0}>
              <p className="px-2.5 py-3 text-center text-caption-lg text-fg-tertiary">
                No tabs found
              </p>
            </RenderIf>
            <ul
              id={listId}
              role="listbox"
              aria-label="Open tabs"
              className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
            >
              {results.map((tab, i) => (
                <li
                  key={tab.path}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  onMouseMove={() => i !== current && setHighlight(i)}
                  onClick={() => openTab(tab)}
                  className={cn(
                    "group/row corner-squircle flex cursor-pointer items-center gap-2.5 rounded-[14px] px-2 py-1.5",
                    i === current
                      ? "bg-foreground/6 text-fg-primary"
                      : "text-fg-secondary",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                    <NodeTabIcon className="size-4 text-fg-tertiary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-body-sm",
                        tab.path === activeHref &&
                          "font-medium text-fg-primary",
                      )}
                    >
                      {tab.title}
                    </span>
                    <span className="block text-caption-sm text-fg-tertiary">
                      {formatRelativeTime(
                        tab.thread.updatedAt ?? tab.thread._creationTime,
                      )}
                    </span>
                  </span>
                  <RenderIf condition={!tab.pinned}>
                    <button
                      type="button"
                      aria-label={`Close ${tab.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose(tab.thread);
                      }}
                      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary opacity-0 outline-none transition-opacity group-hover/row:opacity-100 hover:bg-transparent-hover hover:text-fg-primary focus-visible:opacity-100"
                    >
                      <CloseIcon className="size-3" />
                    </button>
                  </RenderIf>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
