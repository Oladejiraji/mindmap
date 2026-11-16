import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { requireOnboarded } from "@/lib/require-onboarded";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  await requireOnboarded();

  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh overflow-hidden bg-sidebar">
      <HomeSidebar />
      {/* No tabs on Home: the grid is the navigation. The panel sits the
          same 4px from the top as from the right and bottom. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-1 pr-1 pb-1">
        <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain rounded-3xl bg-background bg-(image:--gradient-panel) shadow-default">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
