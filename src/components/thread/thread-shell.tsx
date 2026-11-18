"use client";

import { Suspense, type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { CanvasPanel } from "@/components/thread/canvas-panel";
import { NodePanel } from "@/components/thread/node-panel";
import { FloatingChat } from "@/components/thread/floating-chat";
import { TabStrip, type OpenTabs } from "@/components/layout/tabs/tab-strip";

/*
 * Shell for project pages: the collapsible app sidebar, the tab strip and
 * the page as cards on the shell. The canvas (or chat) is one card; a
 * node opened with ?panel=<nodeId> is a second card beside it, 8px apart,
 * spanning the tabs + canvas height.
 */
export function ThreadShell({
  defaultOpen,
  initialTabs,
  children,
}: {
  defaultOpen: boolean;
  /** The open tabs, fetched on the server. */
  initialTabs?: OpenTabs;
  children: ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="h-svh overflow-hidden bg-sidebar"
    >
      <HomeSidebar />
      <div className="@container flex min-h-0 min-w-0 flex-1 gap-2 pr-1 pb-1">
        {/* Tabs + canvas form one column; the node panel runs the full
            height beside it, its top level with the top of the tabs. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TabStrip initialTabs={initialTabs} />
          {/* The strip draws this card's surface (with the active tab, its
              outline and shadow) behind it. The card paints the same
              background too, so it's there before the surface is measured. */}
          <div className="relative z-2 min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl bg-background bg-(image:--gradient-panel)">
            {children}
            {/* CanvasPanel and NodePanel read the query, so they need Suspense */}
            <Suspense>
              <CanvasPanel />
              <FloatingChat />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <NodePanel />
        </Suspense>
      </div>
    </SidebarProvider>
  );
}
