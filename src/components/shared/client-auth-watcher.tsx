"use client";

import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { PUBLIC_ROUTES, routes } from "@/lib/routes";

// Mid-session watchdog: the server-side `(app)/layout.tsx` gate only fires
// on full navigations, and Convex queries switched to the `"skip"` branch
// when auth is gone never surface an error to trigger a redirect. This
// covers the soft-nav / idle-tab cases where the session dies in the
// background — once Convex's auth state resolves to "not authed," bounce
// to /sign-in.
export function ClientAuthWatcher() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (PUBLIC_ROUTES.includes(window.location.pathname)) return;
    window.location.replace(routes.signIn);
  }, [isAuthenticated, isLoading]);

  return null;
}
