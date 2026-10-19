import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ThreadShell } from "@/components/shared/thread-shell";
import { requireOnboarded } from "@/lib/require-onboarded";

export default async function ThreadLayout({ children }: { children: ReactNode }) {
  await requireOnboarded();

  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <ThreadShell defaultOpen={defaultOpen}>{children}</ThreadShell>;
}
