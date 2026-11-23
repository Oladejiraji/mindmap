"use client";

import { useMemo, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons/chevron-down";
import { useMutation } from "convex/react";
import { GitBranch } from "lucide-react";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import type { Id, Doc } from "@convex/dataModel";
import { api } from "@convex/api";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { Divider } from "@/components/ui/divider";
import { ChatScroller } from "./chat-scroller";
import { NodeComposer } from "./node-composer";
import { useSlashToFocus } from "./use-slash-to-focus";
import { NodeConversation } from "./conversation";
import { RenderIf } from "@/components/shared/render-if";
import { CanvasPanel } from "@/components/thread/canvas-panel";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { markdownToPlainText } from "@/lib/markdown";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

/*
 * ChatGPT-style view of a project's tree.
 *
 * The conversation is the path root → active node; each node contributes
 * its own messages. Where a node has several children, the fork shows a
 * "‹ 2 / 3 ›" switcher (like ChatGPT's edited-message branches): flipping
 * it follows that sibling down its first-child line, and the rest of the
 * conversation re-renders. "Branch from here" on a reply creates a child
 * node and continues the conversation in it. Uses existing queries and
 * mutations only (messages.listByNode, nodes.createEmptyBranch, chat.send, chat.stop).
 */
export function BranchChat({
  nodes,
  activeNodeId,
  onActiveNodeChange,
}: {
  nodes: Doc<"nodes">[];
  activeNodeId: Id<"nodes">;
  onActiveNodeChange: (id: Id<"nodes">) => void;
}) {
  const nodeMap = useMemo(() => buildNodeMap(nodes), [nodes]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, Doc<"nodes">[]>();
    for (const n of nodes) {
      if (!n.parentId) continue;
      const list = map.get(n.parentId) ?? [];
      list.push(n);
      map.set(n.parentId, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a._creationTime - b._creationTime);
    return map;
  }, [nodes]);

  const path = useMemo(
    () => walkAncestors(nodeMap, activeNodeId),
    [nodeMap, activeNodeId],
  );
  const active = path.at(-1);

  // Follow the first child down from a node, the way ChatGPT shows the
  // latest continuation of a branch.
  const deepest = (id: Id<"nodes">): Id<"nodes"> => {
    let current = id;
    for (let i = 0; i < 100; i++) {
      const kids = childrenOf.get(current);
      if (!kids?.length) break;
      current = kids[0]._id;
    }
    return current;
  };

  // New messages arrive in the active node; switching branch counts too.
  const { data: activeMessages } = useAuthedConvexQuery(
    api.messages.listByNode,
    { nodeId: activeNodeId },
  );
  const latestKey = `${activeNodeId}:${activeMessages?.length ?? 0}`;
  const isStreaming = activeMessages?.some((m) => m.isStreaming) ?? false;
  const createBranch = useMutation(api.nodes.createEmptyBranch);

  const branchFrom = async (nodeId: Id<"nodes">) => {
    try {
      const { childId } = await createBranch({ parentId: nodeId });
      onActiveNodeChange(childId);
    } catch (err) {
      handleError(err, "Failed to create branch");
    }
  };

  const composerRef = useRef<HTMLDivElement>(null);
  useSlashToFocus(composerRef);

  if (!active) return null;

  return (
    <ChatScroller
      latestKey={latestKey}
      streaming={isStreaming}
      footer={
        <div className="px-6 pb-6">
          <div ref={composerRef} className="relative mx-auto w-full max-w-180">
            <CanvasPanel variant="docked" />
            <NodeComposer
              nodeId={activeNodeId}
              onNewBranch={() => void branchFrom(activeNodeId)}
              context={[
                { icon: <CanvasViewIcon />, label: path[0].title },
                ...(path.length > 1 ? [{ icon: <GitBranch />, label: active.title }] : []),
              ]}
            />
          </div>
        </div>
      }
    >
      {/* Sections with messages (or still loading) carry data-filled; when
          none do, the whole branch is empty and shows one empty state */}
      {/* The top 80px is under the Canvas/Chat toggle: messages scrolled
          to the top stop below it. */}
      <div className="mx-auto flex w-full max-w-[720px] flex-col px-6 pt-20 pb-10 [&_[data-message]]:scroll-mt-20">
        <div className="flex flex-col items-center gap-3 pt-16 text-center [:has([data-filled])>&]:hidden">
          <p className="text-body-sm text-fg-tertiary">No messages in this branch</p>
          <p className="flex items-center gap-1.5 text-caption-lg text-fg-tertiary">
            Press <Kbd>/</Kbd> to start
          </p>
        </div>
        {path.map((node, i) => {
          const parent = i > 0 ? path[i - 1] : undefined;
          const siblings = parent ? (childrenOf.get(parent._id) ?? []) : [];
          const index = siblings.findIndex((s) => s._id === node._id);
          return (
            <NodeSection
              key={node._id}
              nodeId={node._id}
              title={node.title}
              parentNotes={path
                .slice(0, i)
                .filter((n) => hasNotes(n.content))
                .map((n) => n.title)}
              showDivider={i > 0}
              onBranch={() => void branchFrom(node._id)}
              header={
                <ForkHeader
                  title={node.title}
                  isRoot={i === 0}
                  index={index}
                  count={siblings.length}
                  onPrev={() => index > 0 && onActiveNodeChange(deepest(siblings[index - 1]._id))}
                  onNext={() =>
                    index < siblings.length - 1 && onActiveNodeChange(deepest(siblings[index + 1]._id))
                  }
                />
              }
            />
          );
        })}
      </div>
    </ChatScroller>
  );
}

/* The point where the conversation enters a node. At a fork it carries the
 * ChatGPT-style sibling switcher. */
function ForkHeader({
  title,
  isRoot,
  index,
  count,
  onPrev,
  onNext,
}: {
  title: string;
  isRoot: boolean;
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-center">
      <div className="flex items-center gap-1.5 text-caption-lg text-fg-tertiary">
        {isRoot ? (
          <CanvasViewIcon className="size-3.5" />
        ) : (
          <GitBranch className="size-3.5" />
        )}
        <span className="max-w-60 truncate font-medium text-fg-secondary">
          {title}
        </span>
        {count > 1 && (
          <span
            className="ml-1 flex items-center gap-0.5 tabular-nums"
            aria-label={`Branch ${index + 1} of ${count}`}
          >
            <button
              onClick={onPrev}
              disabled={index <= 0}
              aria-label="Previous branch"
              className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-transparent-hover hover:text-fg-primary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>
            {index + 1} / {count}
            <button
              onClick={onNext}
              disabled={index >= count - 1}
              aria-label="Next branch"
              className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-transparent-hover hover:text-fg-primary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/* One node's part of the conversation; a node with no messages adds
 * nothing (no header, no line). data-filled marks a section with messages
 * (or still loading), for the branch's empty state. */
function NodeSection({
  nodeId,
  title,
  showDivider,
  header,
  onBranch,
  parentNotes,
}: {
  nodeId: Id<"nodes">;
  title: string;
  showDivider: boolean;
  header: React.ReactNode;
  onBranch: () => void;
  parentNotes: string[];
}) {
  return (
    <section aria-label={title}>
      <NodeConversation
        nodeId={nodeId}
        loading={<div data-filled className="h-10" />}
        header={
          <div data-filled>
            <RenderIf condition={showDivider}>
              <Divider color="strong" className="my-10" />
            </RenderIf>
            {header}
          </div>
        }
        parentNotes={parentNotes}
        onBranch={onBranch}
      />
    </section>
  );
}

const hasNotes = (content: string | undefined) =>
  markdownToPlainText(content).length > 0;
