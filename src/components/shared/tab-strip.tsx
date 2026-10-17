"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PencilLine, Plus, X } from "lucide-react";
import { CanvasIcon } from "@/components/icons/canvas-icon";
import { BranchNodeIcon } from "@/components/icons/node-icons";
import { closeTab, useTabs } from "@/lib/tabs";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/*
 * Browser-style tab strip (modelled on define.app). The active tab takes
 * the colour of the panel below (--tab-bg) and joins it with inverted
 * corners; inactive tabs fade their titles out and are split by hairlines.
 */
export function TabStrip({ className, skipOnNodePages = false }: { className?: string; skipOnNodePages?: boolean }) {
  const tabs = useTabs();
  const pathname = usePathname();
  const router = useRouter();
  // Node pages render their own strip above the main column (beside the sidebar).
  if (skipOnNodePages && /\/n\//.test(pathname)) return null;
  // Node pages sit on the container surface; the canvas on the page surface.
  const panelColor = /\/n\//.test(pathname) ? "var(--surface-container)" : "var(--background)";

  const activeIndex = tabs.findIndex((t) => t.href === pathname);

  return (
    <div
      role="tablist"
      aria-label="Open tabs"
      className={cn("flex h-10 shrink-0 items-end overflow-x-auto px-3 [scrollbar-width:none]", className)}
      style={{ ["--tab-bg" as string]: panelColor }}
    >
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        const Icon = tab.kind === "project" ? CanvasIcon : tab.kind === "new" ? PencilLine : BranchNodeIcon;
        const showDivider = i > 0 && !active && i - 1 !== activeIndex;
        return (
          <div
            key={tab.href}
            role="presentation"
            className={cn(
              "group/tab relative flex h-9 max-w-60 min-w-28 flex-1 basis-52 items-center",
              active && "z-10 rounded-t-xl bg-(--tab-bg)",
              // inverted corners that join the active tab to the panel
              active &&
                "before:pointer-events-none before:absolute before:bottom-0 before:-left-3 before:size-3 before:bg-[radial-gradient(circle_at_0_0,transparent_12px,var(--tab-bg)_12.5px)] after:pointer-events-none after:absolute after:-right-3 after:bottom-0 after:size-3 after:bg-[radial-gradient(circle_at_100%_0,transparent_12px,var(--tab-bg)_12.5px)]",
            )}
          >
            {showDivider && <span aria-hidden className="absolute top-1/2 left-0 h-4 w-px -translate-y-1/2 bg-border-default" />}
            <Link
              href={tab.href}
              role="tab"
              aria-selected={active}
              title={tab.title}
              className={cn(
                "flex h-full min-w-0 flex-1 items-center gap-2 rounded-t-xl pr-7 pl-3 text-body-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "font-medium text-fg-primary" : "text-fg-secondary hover:text-fg-primary",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-fg-secondary" : "text-fg-tertiary")} />
              <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)]">
                {tab.title}
              </span>
            </Link>
            <button
              aria-label={`Close ${tab.title}`}
              onClick={() => {
                const next = closeTab(tab.href, pathname);
                if (next) router.push(next);
              }}
              className={cn(
                "absolute right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-opacity hover:bg-transparent-hover hover:text-fg-primary focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
      <Link
        href={routes.newProject}
        aria-label="New project"
        title="New project"
        className="mb-1 ml-1 flex size-7 shrink-0 items-center justify-center self-end rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Plus className="size-4" />
      </Link>
    </div>
  );
}
