import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ThreadShell } from "@/components/shared/thread-shell";

export default async function ThreadLayout({ children }: { children: ReactNode }) {
  // Same cookie the sidebar writes, so it stays open/closed across pages.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <ThreadShell defaultOpen={defaultOpen}>{children}</ThreadShell>;
}
