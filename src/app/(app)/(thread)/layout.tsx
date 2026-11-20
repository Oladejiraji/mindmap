import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { api } from "@convex/api";
import { ThreadShell } from "@/components/thread/thread-shell";
import { fetchAuthQuery } from "@/lib/auth-server";
import { requireOnboarded } from "@/lib/require-onboarded";

export default async function ThreadLayout({
  children,
}: {
  children: ReactNode;
}) {
  // The open tabs come with the page, so the strip is there on first paint
  // (the client's live query takes over once it connects).
  const [, initialTabs, cookieStore] = await Promise.all([
    requireOnboarded(),
    fetchAuthQuery(api.tabs.list, {}).catch(() => undefined),
    cookies(),
  ]);

  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  return (
    <ThreadShell defaultOpen={defaultOpen} initialTabs={initialTabs}>
      {children}
    </ThreadShell>
  );
}
