"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { routes } from "@/lib/routes";

export function NewChatButton() {
  return (
    <Link
      href={routes.home}
      className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-md pl-2 pr-8 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <Plus size={14} className="shrink-0" />
      <span>New chat</span>
    </Link>
  );
}
