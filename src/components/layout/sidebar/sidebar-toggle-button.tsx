"use client";

import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

/* Collapses the shadcn sidebar to its icon rail and back (also ⌘B). */
export function SidebarToggleButton({ className }: { className?: string }) {
  const { open, toggleSidebar } = useSidebar();
  return (
    <Tip
      label={
        <>
          {open ? "Collapse sidebar" : "Expand sidebar"} <span className="text-white/50">⌘B</span>
        </>
      }
    >
      <button
        onClick={toggleSidebar}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={open}
        className={cn(
          "flex size-7 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <SidebarToggleIcon open={open} className="size-4" />
      </button>
    </Tip>
  );
}
