import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/api";
import { getToken } from "@/lib/auth-server";
import { routes } from "@/lib/routes";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const token = await getToken();
  if (token) {
    const viewer = await fetchQuery(api.users.viewer, {}, { token });
    if (viewer?.onboardedAt) {
      redirect(routes.home);
    }
  }
  return <>{children}</>;
}
