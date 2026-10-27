"use client";

import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { isAuthError } from "@/lib/auth-errors";
import { redirectToSignInIfAuthError } from "@/lib/handle-error";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const convexQueryClient = new ConvexQueryClient(convex);
    const client = new QueryClient({
      queryCache: new QueryCache({ onError: redirectToSignInIfAuthError }),
      defaultOptions: {
        queries: {
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
          // Don't retry auth errors — the token won't magically become valid
          // in 30ms. Retrying just burns three round-trips before onError
          // fires and we redirect.
          retry: (failureCount, error) =>
            !isAuthError(error) && failureCount < 3,
        },
      },
    });
    convexQueryClient.connect(client);
    return client;
  });

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConvexBetterAuthProvider>
  );
}
