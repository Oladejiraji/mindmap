"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatBreadcrumb } from "@/components/shared/chat-breadcrumb";
import { CanvasToggle } from "@/components/shared/canvas-toggle";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <ChatBreadcrumb />
      <div className="ml-auto">
        <CanvasToggle />
      </div>
    </header>
  );
}
