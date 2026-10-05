import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/sidebar/app-sidebar";
import { Header } from "@/components/shared/header";

export default function ThreadLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="bg-sidebar">
      <AppSidebar />
      <SidebarInset className="my-1 mr-1 overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(198,198,198,0.25)]">
        <Header />
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
