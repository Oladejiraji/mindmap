"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@convex/dataModel";
import { NodeEditorView } from "@/components/editor/node-editor-view";

/*
 * Right-hand node panel for a project (?panel=<nodeId>): its own card
 * beside the canvas card (same surface, radius and shadow). It is the
 * narrow one (about a quarter, 340–440px); the canvas keeps the rest. Esc or × closes it (drops ?panel and ?tab).
 */
export function NodePanel() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = pathname.match(/^\/t\/([^/]+)$/)?.[1] as Id<"threads"> | undefined;
  const nodeId = searchParams.get("panel") as Id<"nodes"> | null;
  const open = !!(threadId && nodeId);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    next.delete("tab");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Esc closes, unless a field or menu inside the page is handling it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <aside
      aria-label="Node"
      className="w-[clamp(340px,28%,440px)] shrink-0 overflow-hidden rounded-3xl bg-background shadow-default motion-translate-x-in-[12px] motion-opacity-in-0 motion-duration-200 motion-ease-out"
    >
      <NodeEditorView threadId={threadId} nodeId={nodeId} onClose={close} />
    </aside>
  );
}
