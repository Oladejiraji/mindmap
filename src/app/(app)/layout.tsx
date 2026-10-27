import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ClientAuthWatcher } from "@/components/shared/client-auth-watcher";
import { isAuthenticated } from "@/lib/auth-server";
import { routes } from "@/lib/routes";

export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await isAuthenticated())) {
    redirect(routes.signIn);
  }

  return (
    <>
      <ClientAuthWatcher />
      {children}
    </>
  );
}
