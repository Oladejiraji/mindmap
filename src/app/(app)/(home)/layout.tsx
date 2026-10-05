import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/shared/sidebar/home-sidebar";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="bg-sidebar">
      <HomeSidebar />
      <div className="flex-1 min-h-0 py-1 pr-1">
        <div className="h-full overflow-auto rounded-sm bg-background">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
