"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/shared/sidebar/home-sidebar";
import { SidebarToggleButton } from "@/components/shared/sidebar/sidebar-toggle-button";
import { CanvasPanel } from "@/components/shared/canvas-panel";
import { TabStrip } from "@/components/shared/tab-strip";

/*
 * Shell for project pages. Canvas, chat and new-project get the same
 * collapsible app sidebar as home; node pages bring their own project
 * sidebar and tab strip, so they keep the bare full-bleed frame.
 */
export function ThreadShell({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  const pathname = usePathname();

  if (/\/n\//.test(pathname)) {
    return (
      <div className="flex h-svh w-full flex-col bg-sidebar">
        <div className="relative min-h-0 w-full flex-1 bg-background">{children}</div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden bg-sidebar">
      <HomeSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-1 pb-1">
        <TabStrip className="px-0" />
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-background bg-(image:--gradient-panel) shadow-default">
          <SidebarToggleButton className="absolute top-3 left-3 z-20" />
          {children}
          {/* CanvasPanel reads ?view=, so it needs a Suspense boundary */}
          <Suspense>
            <CanvasPanel />
          </Suspense>
        </div>
      </div>
    </SidebarProvider>
  );
}
