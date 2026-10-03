"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@convex/api";

export function StoreUserProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const stored = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || stored.current) return;
    stored.current = true;
    void storeUser();
  }, [isAuthenticated, storeUser]);

  return <>{children}</>;
}
