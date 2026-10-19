import "server-only";

import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/api";
import { getToken } from "@/lib/auth-server";
import { routes } from "@/lib/routes";

export async function requireOnboarded() {
  const token = await getToken();
  if (!token) return;
  const viewer = await fetchQuery(api.users.viewer, {}, { token });
  if (viewer && !viewer.onboardedAt) {
    redirect(routes.onboarding);
  }
}
