import type { Id } from "@convex/dataModel";

// Single source of truth for app paths. If a URL moves, change it here
// once — all Link hrefs, router.push calls, redirect guards, and route-
// group checks read from this registry.
export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  signOut: "/sign-out",
  thread: (threadId: Id<"threads">) => `/t/${threadId}`,
  node: (threadId: Id<"threads">, nodeId: Id<"nodes">) =>
    `/t/${threadId}/n/${nodeId}`,
} as const;

// Paths where a client-side auth-error redirect should be a no-op
// (they're the auth flow itself, redirecting into them would loop or
// clobber a transition that's about to resolve).
export const PUBLIC_ROUTES: readonly string[] = [
  routes.signIn,
  routes.signUp,
  routes.signOut,
];
