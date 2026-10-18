"use client";

import { Suspense, type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/shared/sidebar/home-sidebar";
import { CanvasPanel } from "@/components/shared/canvas-panel";
import { NodePanel } from "@/components/shared/node-panel";
import { TabStrip } from "@/components/shared/tab-strip";

/*
 * Shell for project pages: the collapsible app sidebar, the tab strip and
 * the page as cards on the shell. The canvas (or chat) is one card; a
 * node opened with ?panel=<nodeId> is a second card beside it, 8px apart.
 */
export function ThreadShell({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden bg-sidebar">
      <HomeSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-1 pb-1">
        <TabStrip className="px-0" />
        <div className="flex min-h-0 flex-1 gap-2">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-3xl [[data-first-active]+*>&]:rounded-tl-none bg-background bg-(image:--gradient-panel) shadow-default">
            {children}
            {/* CanvasPanel and NodePanel read the query, so they need Suspense */}
            <Suspense>
              <CanvasPanel />
            </Suspense>
          </div>
          <Suspense>
            <NodePanel />
          </Suspense>
        </div>
      </div>
    </SidebarProvider>
  );
}
