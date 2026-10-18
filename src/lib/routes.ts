import type { Id } from "@convex/dataModel";

// Single source of truth for app paths. If a URL moves, change it here
// once — all Link hrefs, router.push calls, redirect guards, and route-
// group checks read from this registry.
export const routes = {
  home: "/",
  newProject: "/new",
  signIn: "/sign-in",
  signUp: "/sign-up",
  signOut: "/sign-out",
  thread: (threadId: string) => `/t/${threadId}`,
  // Nodes open as a side panel over their project, not as their own page.
  node: (threadId: string, nodeId: Id<"nodes">) => `/t/${threadId}?panel=${nodeId}`,
} as const;

// Paths where a client-side auth-error redirect should be a no-op
// (they're the auth flow itself, redirecting into them would loop or
// clobber a transition that's about to resolve).
export const PUBLIC_ROUTES: readonly string[] = [
  routes.signIn,
  routes.signUp,
  routes.signOut,
];
