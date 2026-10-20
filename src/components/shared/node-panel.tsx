"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@convex/dataModel";
import { NodeEditorView } from "@/components/editor/node-editor-view";
import { cn } from "@/lib/utils";

/*
 * Right-hand node panel for a project (?panel=<nodeId>): its own card
 * beside the canvas card (same surface, radius and shadow). It is the
 * narrow one (about a quarter, 340–440px); the canvas keeps the rest. Esc or × closes it (drops ?panel and ?tab).
 * Opening and closing animate the panel's slot width, so the tabs + canvas
 * column resizes smoothly beside it; the card inside keeps its full width
 * (sized off the shell with container units) so its content never squashes.
 */
const PANEL_W = "clamp(340px,28cqw,440px)";

export function NodePanel() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = pathname.match(/^\/t\/([^/]+)$/)?.[1] as Id<"threads"> | undefined;
  const nodeId = searchParams.get("panel") as Id<"nodes"> | null;
  const open = !!(threadId && nodeId);
  // Keep showing the last node while the slot animates closed.
  const [shownId, setShownId] = useState(nodeId);
  if (nodeId && nodeId !== shownId) setShownId(nodeId);

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    next.delete("tab");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  // Pop the node's chat out to float over the canvas (canvas mode only)
  const inChatView = searchParams.get("view") === "chat";
  const popOut = useCallback(() => {
    if (!shownId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    next.delete("tab");
    next.set("float", shownId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [searchParams, pathname, router, shownId]);

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
  }, [open, close]);

  return (
    // The slot: width animates 0 ↔ panel width; the negative margin cancels
    // the shell's 8px gap while closed so the canvas reaches the edge.
    <div
      aria-hidden={!open}
      inert={!open}
      style={{ width: open ? PANEL_W : 0 }}
      className={cn(
        "flex shrink-0 justify-end overflow-hidden pt-2 transition-[width,margin] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
        !open && "-ml-2",
      )}
    >
      {threadId && shownId && (
        <aside
          aria-label="Node"
          style={{ width: PANEL_W }}
          className="h-full shrink-0 overflow-hidden rounded-3xl bg-background shadow-default"
        >
          <NodeEditorView
            threadId={threadId}
            nodeId={shownId as Id<"nodes">}
            onClose={close}
            onPopOut={inChatView ? undefined : popOut}
          />
        </aside>
      )}
    </div>
  );
}
