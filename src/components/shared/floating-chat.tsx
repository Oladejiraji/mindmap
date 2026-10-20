"use client";

import { useRef, useState, type PointerEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@convex/dataModel";
import { NodeChat } from "@/components/chat/node-chat";
import { CloseIcon } from "@/components/icons/close-icon";
import { FloatIcon } from "@/components/icons/float-icon";
import { useNode } from "@/services/nodes/queries";

/*
 * A node's chat popped out of the side panel (?float=<nodeId>): a card
 * floating over the canvas, bottom-right, that you can drag by its
 * header. The float icon docks it back into the side panel on its chat
 * tab; × closes it. Canvas mode only: in chat view the conversation is
 * already the page.
 */
export function FloatingChat() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = pathname.match(/^\/t\/([^/]+)$/)?.[1] as Id<"threads"> | undefined;
  const nodeId = searchParams.get("float") as Id<"nodes"> | null;
  const inChatView = searchParams.get("view") === "chat";

  const setQuery = (edit: (q: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    edit(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const close = () => setQuery((q) => q.delete("float"));
  const dock = () =>
    setQuery((q) => {
      q.delete("float");
      if (nodeId) q.set("panel", nodeId);
      q.set("tab", "chat");
    });

  if (!threadId || !nodeId || inChatView) return null;
  return <FloatingCard key={nodeId} threadId={threadId} nodeId={nodeId} onDock={dock} onClose={close} />;
}

function FloatingCard({
  threadId,
  nodeId,
  onDock,
  onClose,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
  onDock: () => void;
  onClose: () => void;
}) {
  const { data: node } = useNode(nodeId);
  const cardRef = useRef<HTMLDivElement>(null);
  // Offset from its resting corner, kept inside the canvas card
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const card = cardRef.current;
    const bounds = card?.parentElement?.getBoundingClientRect();
    if (!d || !card || !bounds) return;
    const pad = 16;
    // Resting position is bottom-right; offsets go left/up (negative)
    const minX = -(bounds.width - card.offsetWidth - pad * 2);
    const minY = -(bounds.height - card.offsetHeight - pad * 2);
    setOffset({
      x: Math.min(0, Math.max(minX, d.ox + e.clientX - d.x)),
      y: Math.min(0, Math.max(minY, d.oy + e.clientY - d.y)),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Chat: ${node?.title ?? "Node"}`}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      className="corner-squircle absolute right-4 bottom-4 z-20 flex h-[min(520px,calc(100%-32px))] w-[min(380px,calc(100%-32px))] flex-col overflow-hidden rounded-3xl bg-surface-container shadow-large motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
    >
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex h-11 shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border-default pr-2 pl-4 select-none active:cursor-grabbing"
      >
        <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg-primary">{node?.title ?? "Chat"}</p>
        <button type="button" onClick={onDock} aria-label="Dock in side panel" title="Dock in side panel" className={iconButton}>
          <FloatIcon className="size-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close chat" title="Close" className={iconButton}>
          <CloseIcon className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <NodeChat threadId={threadId} nodeId={nodeId} />
      </div>
    </div>
  );
}

const iconButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50";
