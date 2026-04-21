"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-3 px-4 text-center">
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred while rendering this page.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}
