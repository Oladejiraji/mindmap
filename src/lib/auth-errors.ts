import { ConvexError } from "convex/values";

// Our server helpers throw `ConvexError({ code: "UNAUTHORIZED", ... })`.
// The Better Auth Convex component throws `ConvexError("Unauthenticated")`
// with a plain string payload — we match that literal as a narrow fallback
// so we don't regress to message-regex matching.
export function isAuthError(error: unknown): boolean {
  if (!(error instanceof ConvexError)) return false;
  const data = error.data;
  if (typeof data === "object" && data !== null && "code" in data) {
    return (data as { code?: unknown }).code === "UNAUTHORIZED";
  }
  if (typeof data === "string") {
    return data === "Unauthenticated";
  }
  return false;
}
