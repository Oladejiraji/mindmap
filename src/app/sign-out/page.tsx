"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { showError } from "@/lib/toast";

export default function SignOutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { error } = await authClient.signOut();
      if (cancelled) return;
      if (error) {
        showError(error.message ?? "Sign out failed");
        router.replace(routes.home);
        return;
      }
      queryClient.clear();
      router.replace(routes.signIn);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}
