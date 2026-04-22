"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatBreadcrumb } from "@/components/shared/chat-breadcrumb";
import { CanvasToggle } from "@/components/shared/canvas-toggle";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";

export function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <ChatBreadcrumb />
      <div className="ml-auto flex items-center gap-3">
        <CanvasToggle />
        {session?.user && (
          <Link
            href={routes.signOut}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Link>
        )}
      </div>
    </header>
  );
}
