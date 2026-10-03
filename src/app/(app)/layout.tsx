import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeSidebar } from "@/components/shared/sidebar/home-sidebar";
import { ClientAuthWatcher } from "@/components/shared/client-auth-watcher";
import { isAuthenticated } from "@/lib/auth-server";
import { routes } from "@/lib/routes";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await isAuthenticated())) {
    redirect(routes.signIn);
  }

  return (
    <SidebarProvider className="bg-sidebar">
      <ClientAuthWatcher />
      <HomeSidebar />
      <div className="flex-1 overflow-auto py-1 pr-1">
        <div className="h-full overflow-auto rounded-sm bg-background">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
