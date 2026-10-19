"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { showError } from "@/lib/toast";
import { Logo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div
      className="flex h-full items-center justify-center px-4 py-8 rounded-l-lg bg-(image:--gradient-auth-panel) shadow-border"
    >
      <div className="flex flex-col justify-center items-center h-full w-full">
        <div>
          <Logo />
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-78 flex-col justify-center  flex-1"
        >
          <div className="space-y-1.5">
            <h1 className=" font-medium text-center text-white text-heading-6 pb-8">
              Welcome back
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="py-6 w-full">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="relative w-full flex items-center justify-center"
            >
              <p className="text-body-sm font-medium">Sign in</p>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-sidebar-ring rounded-sm h-4 w-9.5 flex items-center justify-center">
                <p className="text-background/87 text-caption-base font-medium">return</p>
              </div>
            </Button>
          </div>
          <p className="text-center text-background/67 text-caption-base">
            No account?{" "}
            <Link href={routes.signUp} className=" hover:underline">
              Sign up
            </Link>
          </p>
        </form>
        <div>
          <p className="text-background/67 text-caption-base text-center max-w-78">
            By signing in, you agree Mindmap’s Terms of Use, and acknowledge its
            Information Collection Notice and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
