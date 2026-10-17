"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ArrowDown, ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import type { Node } from "@/services/nodes/queries";
import { useMessagesByNode, type Message } from "@/services/messages/queries";
import { useSendMessage } from "@/services/chat/actions";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { Divider } from "@/components/ui/divider";
import { ChatInput } from "./chat-input";

/*
 * ChatGPT-style view of a project's tree.
 *
 * The conversation is the path root → active node; each node contributes
 * its own messages. Where a node has several children, the fork shows a
 * "‹ 2 / 3 ›" switcher (like ChatGPT's edited-message branches): flipping
 * it follows that sibling down its first-child line, and the rest of the
 * conversation re-renders. "Branch from here" on a reply creates a child
 * node and continues the conversation in it. Uses existing queries and
 * mutations only (messages.listByNode, nodes.createEmptyBranch, chat.sendMessage).
 */
export function BranchChat({
  threadId,
  nodes,
  activeNodeId,
  onActiveNodeChange,
}: {
  threadId: Id<"threads">;
  nodes: Node[];
  activeNodeId: Id<"nodes">;
  onActiveNodeChange: (id: Id<"nodes">) => void;
}) {
  const nodeMap = useMemo(() => buildNodeMap(nodes), [nodes]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, Node[]>();
    for (const n of nodes) {
      if (!n.parentId) continue;
      const list = map.get(n.parentId) ?? [];
      list.push(n);
      map.set(n.parentId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a._creationTime - b._creationTime);
    return map;
  }, [nodes]);

  const path = useMemo(() => walkAncestors(nodeMap, activeNodeId), [nodeMap, activeNodeId]);
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

  const { data: activeMessages } = useMessagesByNode(activeNodeId);
  const isStreaming = activeMessages?.some((m) => m.isStreaming) ?? false;
  const sendMessage = useSendMessage();
  const createBranch = useMutation(api.nodes.createEmptyBranch);
  const [isSending, setIsSending] = useState(false);

  const send = async (content: string) => {
    setIsSending(true);
    try {
      await sendMessage({ nodeId: activeNodeId, content });
      setIsSending(false);
    } catch (err) {
      handleError(err, "Failed to send message");
      setTimeout(() => setIsSending(false), 600);
    }
  };

  const branchFrom = async (nodeId: Id<"nodes">) => {
    try {
      const { childId } = await createBranch({ parentId: nodeId });
      onActiveNodeChange(childId);
    } catch (err) {
      handleError(err, "Failed to create branch");
    }
  };

  // Keep the newest message in view (scrolling a DOM node is an external
  // system, so an effect is the right tool).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAwayFromBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 160);
  };
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  const messageCount = activeMessages?.length ?? 0;
  const lastLength = activeMessages?.at(-1)?.content.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeNodeId, messageCount, lastLength]);

  if (!active) return null;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[720px] flex-col px-6 pt-20 pb-10">
          {path.map((node, i) => {
            const parent = i > 0 ? path[i - 1] : undefined;
            const siblings = parent ? (childrenOf.get(parent._id) ?? []) : [];
            const index = siblings.findIndex((s) => s._id === node._id);
            return (
              <section key={node._id} aria-label={node.title}>
                {i > 0 && <Divider color="strong" className="my-10" />}
                <ForkHeader
                  title={node.title}
                  isRoot={i === 0}
                  index={index}
                  count={siblings.length}
                  onPrev={() => index > 0 && onActiveNodeChange(deepest(siblings[index - 1]._id))}
                  onNext={() => index < siblings.length - 1 && onActiveNodeChange(deepest(siblings[index + 1]._id))}
                />
                <NodeMessages nodeId={node._id} onBranch={() => void branchFrom(node._id)} />
              </section>
            );
          })}
        </div>
      </div>

      <div className="relative shrink-0 px-6 pb-6">
        {/* Jump to latest, shown once you've scrolled up */}
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          tabIndex={awayFromBottom ? 0 : -1}
          className={cn(
            "absolute -top-12 left-1/2 flex size-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-surface-container text-fg-primary shadow-large outline-none transition-[opacity,transform] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
            awayFromBottom ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0",
          )}
        >
          <ArrowDown className="size-4.5" />
        </button>
        <div className="mx-auto w-full max-w-[720px]">
          <ChatInput
            onSend={send}
            disabled={isSending || isStreaming}
            onNewBranch={() => void branchFrom(activeNodeId)}
            context={[
              { icon: <CanvasViewIcon />, label: path[0].title },
              ...(path.length > 1 ? [{ icon: <GitBranch />, label: active.title }] : []),
            ]}
          />
        </div>
      </div>
    </div>
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
        {isRoot ? <CanvasViewIcon className="size-3.5" /> : <GitBranch className="size-3.5" />}
        <span className="max-w-60 truncate font-medium text-fg-secondary">{title}</span>
        {count > 1 && (
          <span className="ml-1 flex items-center gap-0.5 tabular-nums" aria-label={`Branch ${index + 1} of ${count}`}>
            <button
              onClick={onPrev}
              disabled={index <= 0}
              aria-label="Previous branch"
              className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-transparent-hover hover:text-fg-primary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {index + 1} / {count}
            <button
              onClick={onNext}
              disabled={index >= count - 1}
              aria-label="Next branch"
              className="flex size-5 cursor-pointer items-center justify-center rounded-md hover:bg-transparent-hover hover:text-fg-primary disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function NodeMessages({ nodeId, onBranch }: { nodeId: Id<"nodes">; onBranch: () => void }) {
  const { data: messages, isLoading } = useMessagesByNode(nodeId);
  if (isLoading) return <div className="h-10" />;
  if (!messages?.length) {
    return <p className="text-center text-body-sm text-fg-tertiary">No messages in this branch yet.</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m: Message) => (
        <div key={m._id} className="group/msg">
          <MessageBubble message={m} />
          {m.role !== "user" && !m.isStreaming && (
            <div className="mt-1.5 flex opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100">
              <button
                onClick={onBranch}
                className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-body-sm text-fg-tertiary outline-none hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <GitBranch className="size-3.5" />
                Branch from here
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
