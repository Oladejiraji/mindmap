"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

// Gates a Convex query with `"skip"` until `useConvexAuth().isAuthenticated`
// flips true, so the subscription never fires without a token attached.
// Tanstack's `enabled: false` isn't sufficient on its own — the Convex
// adapter subscribes on the "added" cache event regardless of enabled
// state. Passing `"skip"` as args is the only real skip mechanism.
//
// Redirecting on auth errors is intentionally NOT done here — that's the
// `ClientAuthWatcher`'s job. Keeping concerns separate: this hook only
// decides when a query may run.
export function useAuthedConvexQuery<Query extends FunctionReference<"query">>(
  funcRef: Query,
  args: FunctionArgs<Query>,
) {
  const { isAuthenticated } = useConvexAuth();
  const options = convexQuery(
    funcRef,
    (isAuthenticated ? args : "skip") as FunctionArgs<Query>,
  );
  return useQuery(options) as ReturnType<
    typeof useQuery<FunctionReturnType<Query>, Error, FunctionReturnType<Query>>
  >;
}
