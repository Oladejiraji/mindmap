import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { api } from "@convex/api";
import { ThreadShell } from "@/components/thread/thread-shell";
import { InitialOrgProvider } from "@/components/project/initial-org";
import { fetchAuthQuery } from "@/lib/auth-server";
import { requireOnboarded } from "@/lib/require-onboarded";

export default async function ThreadLayout({
  children,
}: {
  children: ReactNode;
}) {
  // The open tabs come with the page, so the strip is there on first paint
  // (the client's live query takes over once it connects). So do the
  // viewer and their org, for the New project page: fetched here, once,
  // rather than by the page on every visit.
  const [, initialTabs, initialOrg, cookieStore] = await Promise.all([
    requireOnboarded(),
    fetchAuthQuery(api.tabs.list, {}).catch(() => undefined),
    fetchAuthQuery(api.organizations.current, {}).catch(() => undefined),
    cookies(),
  ]);

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  return (
    <InitialOrgProvider value={initialOrg}>
      <ThreadShell defaultOpen={defaultOpen} initialTabs={initialTabs}>
        {children}
      </ThreadShell>
    </InitialOrgProvider>
  );
}
