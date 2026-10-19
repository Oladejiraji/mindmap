import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/shared/sidebar/home-sidebar";
import { TabStrip } from "@/components/shared/tab-strip";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  // Same cookie the sidebar writes, so it stays open/closed across pages.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden bg-sidebar">
      <HomeSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-1 pb-1">
        <TabStrip className="px-0" />
        <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded-3xl [[data-first-active]+&]:rounded-tl-none bg-background bg-(image:--gradient-panel) shadow-default">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
