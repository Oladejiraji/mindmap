"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { showError } from "@/lib/toast";

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      showError(error.message ?? "Sign in failed");
      setIsSubmitting(false);
      return;
    }
    queryClient.clear();
    router.replace(routes.home);
  };

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue your conversations.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          No account?{" "}
          <Link href={routes.signUp} className="text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
