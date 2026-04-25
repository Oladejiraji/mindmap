import "server-only";

import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { isAuthError } from "@/lib/auth-errors";

// `jwtCache` decodes the session JWT from the request cookie locally instead
// of round-tripping to Convex on every protected page render. It invalidates
// when the JWT naturally expires or when a downstream Convex call throws an
// auth error matched by `isAuthError`. The flag is experimental upstream
// (labs.convex.dev/better-auth/experimental) — package version is pinned.
export const { handler, isAuthenticated, getToken } = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  jwtCache: {
    enabled: true,
    isAuthError,
  },
});
