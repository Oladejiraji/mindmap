import { isAuthError } from "./auth-errors";
import { PUBLIC_ROUTES, routes } from "./routes";
import { showError } from "./toast";

// Redirects to the sign-in page when an auth error is detected.
// Returns true if a redirect was triggered so the caller can skip
// further side-effects (like toasting).
export function redirectToSignInIfAuthError(error: unknown): boolean {
  if (!isAuthError(error)) return false;
  if (typeof window === "undefined") return false;
  if (PUBLIC_ROUTES.includes(window.location.pathname)) return false;
  window.location.replace(routes.signIn);
  return true;
}

// Default error handler for protected-route call sites:
// auth errors redirect, everything else toasts.
export function handleError(error: unknown, fallback?: string) {
  if (redirectToSignInIfAuthError(error)) return;
  showError(error, fallback);
}
