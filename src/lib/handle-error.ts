import { isRateLimitError } from "@convex-dev/rate-limiter";
import { toast } from "sonner";
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

function toastRateLimitIfApplicable(error: unknown): boolean {
  if (!isRateLimitError(error)) return false;
  const seconds = Math.max(1, Math.ceil(error.data.retryAfter / 1000));
  toast.error(`Slow down — try again in ${seconds}s`);
  return true;
}

// Default error handler for protected-route call sites:
// auth errors redirect, rate-limit errors get a specific toast, others fall
// through to the generic toast.
export function handleError(error: unknown, fallback?: string) {
  if (redirectToSignInIfAuthError(error)) return;
  if (toastRateLimitIfApplicable(error)) return;
  showError(error, fallback);
}
