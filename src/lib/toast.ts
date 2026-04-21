import { ConvexError } from "convex/values";
import { toast } from "sonner";

// Convex throws `ConvexError` / plain `Error` on failure. Surface a readable
// message and log the raw object for devtools.
export function showError(error: unknown, fallback = "Something went wrong") {
  const message = extractMessage(error) ?? fallback;
  console.error(error);
  toast.error(message);
}

function extractMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ConvexError) {
    const fromData = messageFromConvexData(error.data);
    if (fromData) return fromData;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

function messageFromConvexData(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}
