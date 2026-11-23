"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMutation } from "convex/react";
import { GitBranch, Minimize2 } from "lucide-react";
import type { Doc, Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { markdownToPlainText } from "@/lib/markdown";
import { handleError } from "@/lib/handle-error";
import { Tip } from "@/components/ui/tooltip";
import { CloseIcon } from "@/components/icons/close-icon";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { NodeConversation } from "./conversation";
import { NodeComposer } from "./node-composer";
import { ChatScroller } from "./chat-scroller";
import { useSlashToFocus } from "./use-slash-to-focus";

const headerButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * One node's chat, full screen (?chat=<nodeId>): the side panel's chat
 * given the whole page. Just this node's messages, not the path from the
 * root (that's the project's Chat view). Collapse (or Esc) goes back to
 * the panel; × to the canvas.
 */
export function FullNodeChat({
  nodeId,
  nodes,
  onCollapse,
  onClose,
  onNodeChange,
}: {
  nodeId: Id<"nodes">;
  /** The project's nodes, for the node's title and its parents' notes. */
  nodes: Doc<"nodes">[];
  /** Back to the side panel on this node's chat. */
  onCollapse: () => void;
  /** Back to the canvas. */
  onClose: () => void;
  /** Shows another node's chat here: a branch just made from this one. */
  onNodeChange: (nodeId: Id<"nodes">) => void;
}) {
  const path = useMemo(() => walkAncestors(buildNodeMap(nodes), nodeId), [nodes, nodeId]);
  const node = path.at(-1);
  const parentNotes = path
    .slice(0, -1)
    .filter((n) => markdownToPlainText(n.content).length > 0)
    .map((n) => n.title);

  const { data: messages } = useAuthedConvexQuery(api.messages.listByNode, { nodeId });
  const turnKey = messages ? (messages.findLast((m) => m.role === "user")?._id ?? "none") : undefined;

  const createBranch = useMutation(api.nodes.createEmptyBranch);
  const branch = async () => {
    try {
      const { childId } = await createBranch({ parentId: nodeId });
      onNodeChange(childId);
    } catch (err) {
      handleError(err, "Failed to create branch");
    }
  };

  const composerRef = useRef<HTMLDivElement>(null);
  useSlashToFocus(composerRef);

  // Esc collapses back to the panel, unless a field or menu is using it.
  // Listening for keys on the window is an external system.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      onCollapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCollapse]);

  if (!node) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 px-3">
        <Tip label={<>Back to panel <span className="text-white/50">Esc</span></>}>
          <button type="button" onClick={onCollapse} aria-label="Back to panel" className={headerButton}>
            <Minimize2 className="size-3.5" />
          </button>
        </Tip>
        <h2 className="min-w-0 flex-1 truncate px-1 text-body-sm font-medium text-fg-primary">{node.title}</h2>
        <Tip label="Close">
          <button type="button" onClick={onClose} aria-label="Close chat" className={headerButton}>
            <CloseIcon className="size-4" />
          </button>
        </Tip>
      </header>
      <div className="min-h-0 flex-1">
        <ChatScroller
          conversationKey={nodeId}
          turnKey={turnKey}
          footer={
            <div className="px-6 pb-6">
              <div ref={composerRef} className="mx-auto w-full max-w-180">
                <NodeComposer
                  nodeId={nodeId}
                  onNewBranch={() => void branch()}
                  context={[
                    { icon: <CanvasViewIcon />, label: path[0].title },
                    ...(path.length > 1 ? [{ icon: <GitBranch />, label: node.title }] : []),
                  ]}
                />
              </div>
            </div>
          }
        >
          {/* --turn-offset: the 24px above and 40px below the messages. */}
          <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 pt-6 pb-10 [--turn-offset:64px]">
            <NodeConversation
              nodeId={nodeId}
              live
              parentNotes={parentNotes}
              onBranch={() => void branch()}
              empty={
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-body-sm text-fg-tertiary">No messages yet</p>
                  <p className="flex items-center gap-1.5 text-caption-lg text-fg-tertiary">
                    Press <Kbd>/</Kbd> to start
                  </p>
                </div>
              }
            />
          </div>
        </ChatScroller>
      </div>
    </div>
  );
}
