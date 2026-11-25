"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { GitBranch } from "lucide-react";
import { MinimizeIcon } from "@/components/icons/maximize-icons";
import type { Doc, Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { markdownToPlainText } from "@/lib/markdown";
import { handleError } from "@/lib/handle-error";
import { Tip } from "@/components/ui/tooltip";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { NodeConversation } from "./conversation";
import { NodeComposer } from "./node-composer";
import { ChatScroller } from "./chat-scroller";
import { useSlashToFocus } from "./use-slash-to-focus";
import { ContentIcon } from "@/components/icons/content-icon";
import { RenderIf } from "@/components/shared/render-if";
import { NodeDocumentPane } from "@/components/editor/node-document-pane";
import { useEditPreview } from "@/lib/edit-preview";
import { cn } from "@/lib/utils";

const headerButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * One node's chat, full screen (?chat=<nodeId>): the side panel's chat
 * given the whole page. Just this node's messages, not the path from the
 * root (that's the project's Chat view). Collapse (or Esc) goes back to
 * the panel's chat.
 *
 * The node's document opens in a sheet on the right (?doc=1), the same as
 * the panel's Content tab: the editor, or a suggested edit marked in it.
 * With no canvas here, a new suggestion opens the sheet itself, once.
 */
export function FullNodeChat({
  nodeId,
  nodes,
  onCollapse,
  onNodeChange,
  docOpen,
  onDocOpenChange,
}: {
  nodeId: Id<"nodes">;
  /** The project's nodes, for the node's title and its parents' notes. */
  nodes: Doc<"nodes">[];
  /** Back to the side panel on this node's chat. */
  onCollapse: () => void;
  /** Shows another node's chat here: a branch just made from this one. */
  onNodeChange: (nodeId: Id<"nodes">) => void;
  /** The document sheet is open (kept in the URL). */
  docOpen: boolean;
  onDocOpenChange: (open: boolean) => void;
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

  // The suggested edit waiting on this node: undefined while loading.
  const { data: pending } = useAuthedConvexQuery(
    api.proposals.pendingByThread,
    node ? { threadId: node.threadId } : "skip",
  );
  // Only one that edits the document: branches alone have nothing to show there.
  const waitingId = pending && (pending.find((p) => p.nodeId === nodeId && p.preview)?.proposalId ?? null);

  // The sheet also opens on its own for a suggestion that arrives while
  // you're here, or when its preview is turned back on. Once: closing it
  // keeps it closed for that suggestion. Not kept in the URL.
  const [autoFor, setAutoFor] = useState<string | null>(null);
  const [seen, setSeen] = useState({ nodeId: nodeId as string, waitingId });
  if (seen.nodeId !== nodeId || seen.waitingId !== waitingId) {
    setSeen({ nodeId, waitingId });
    // Not one already waiting when the chat (or this node) opened.
    const arrived = seen.nodeId === nodeId && seen.waitingId !== undefined;
    if (waitingId && arrived) setAutoFor(waitingId);
  }
  const preview = useEditPreview();
  const [seenShown, setSeenShown] = useState(preview.shown);
  if (seenShown !== preview.shown) {
    setSeenShown(preview.shown);
    if (waitingId && preview.shown?.proposalId === waitingId) setAutoFor(waitingId);
  }
  const sheetOpen = docOpen || (!!autoFor && autoFor === waitingId);
  const closeSheet = () => {
    setAutoFor(null);
    if (docOpen) onDocOpenChange(false);
  };

  const composerRef = useRef<HTMLDivElement>(null);
  useSlashToFocus(composerRef);

  // Esc closes the sheet, then collapses back to the panel, unless a field
  // or menu is using it. Listening for keys on the window is an external
  // system; the event reads the latest state without re-subscribing.
  const onEscape = useEffectEvent(() => (sheetOpen ? closeSheet() : onCollapse()));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!node) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 px-3">
        <Tip label={<>Back to panel <span className="text-white/50">Esc</span></>}>
          <button type="button" onClick={onCollapse} aria-label="Back to panel" className={headerButton}>
            <MinimizeIcon className="size-4" />
          </button>
        </Tip>
        <h2 className="min-w-0 flex-1 truncate px-1 text-body-sm font-medium text-fg-primary">{node.title}</h2>
        <Tip label={sheetOpen ? "Hide document" : "Show document"}>
          <button
            type="button"
            onClick={() => (sheetOpen ? closeSheet() : onDocOpenChange(true))}
            aria-pressed={sheetOpen}
            aria-label="Document"
            className={cn(headerButton, sheetOpen && "bg-transparent-hover text-fg-primary")}
          >
            <ContentIcon className="size-4" />
          </button>
        </Tip>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
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
        {/* The node's document. Beside the chat; over it on narrow screens. */}
        <RenderIf condition={sheetOpen}>
          <aside
            aria-label="Document"
            className="flex w-full shrink-0 flex-col border-l border-border-default bg-background max-md:absolute max-md:inset-0 max-md:z-20 md:w-110 xl:w-130 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4"
          >
            {/* Closed from the header's document button, or Esc. */}
            <div className="flex h-10 shrink-0 items-center pl-5">
              <h3 className="text-body-sm font-medium text-fg-primary">Document</h3>
            </div>
            <div className="min-h-0 flex-1">
              <NodeDocumentPane threadId={node.threadId} nodeId={nodeId} markdown={node.content ?? ""} />
            </div>
          </aside>
        </RenderIf>
      </div>
    </div>
  );
}
