import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/sidebar/app-sidebar";
import { Header } from "@/components/shared/header";
import { ClientAuthWatcher } from "@/components/shared/client-auth-watcher";
import { isAuthenticated } from "@/lib/auth-server";
import { routes } from "@/lib/routes";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await isAuthenticated())) {
    redirect(routes.signIn);
  }

  return (
    <SidebarProvider>
      <ClientAuthWatcher />
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
