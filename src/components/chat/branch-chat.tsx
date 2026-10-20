"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/chevron-down";
import { useMutation } from "convex/react";
import { ArrowDown, Check, Copy, GitBranch } from "lucide-react";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import type { Node } from "@/services/nodes/queries";
import { useMessagesByNode, type Message } from "@/services/messages/queries";
import { useSendMessage } from "@/services/chat/actions";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { handleError } from "@/lib/handle-error";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";
import { MessageBubble } from "./message-bubble";
import { Divider } from "@/components/ui/divider";
import { ChatInput } from "./chat-input";
import { CanvasPanel } from "@/components/shared/canvas-panel";
import { Kbd } from "@/components/canvas/canvas-shortcuts";
import { CheckIcon } from "@/components/icons/check-icon";
import { blocksToPlainText } from "@/lib/blocks-to-markdown";

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

  // "/" jumps to the message box (unless you're already typing somewhere)
  const composerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      const box = composerRef.current?.querySelector<HTMLElement>("textarea, [contenteditable='true']");
      if (!box) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!active) return null;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Sections with messages (or still loading) carry data-filled; when
            none do, the whole branch is empty and shows one empty state */}
        <div className="mx-auto flex w-full max-w-[720px] flex-col px-6 pt-20 pb-10">
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
                parentNotes={path.slice(0, i).filter((n) => hasNotes(n.content)).map((n) => n.title)}
                showDivider={i > 0}
                onBranch={() => void branchFrom(node._id)}
                header={
                  <ForkHeader
                    title={node.title}
                    isRoot={i === 0}
                    index={index}
                    count={siblings.length}
                    onPrev={() => index > 0 && onActiveNodeChange(deepest(siblings[index - 1]._id))}
                    onNext={() => index < siblings.length - 1 && onActiveNodeChange(deepest(siblings[index + 1]._id))}
                  />
                }
              />
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
        <div ref={composerRef} className="relative mx-auto w-full max-w-[720px]">
          <CanvasPanel variant="docked" />
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

/* One node's part of the conversation; a node with no messages renders
 * nothing. */
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
  const { data: messages, isLoading } = useMessagesByNode(nodeId);
  // An empty node adds nothing to the conversation: no header, no line.
  if (!isLoading && !messages?.length) return null;
  return (
    <section aria-label={title} data-filled>
      {showDivider && <Divider color="strong" className="my-10" />}
      {header}
      {isLoading ? <div className="h-10" /> : <NodeMessages messages={messages ?? []} onBranch={onBranch} parentNotes={parentNotes} />}
    </section>
  );
}

function NodeMessages({
  messages,
  onBranch,
  parentNotes,
}: {
  messages: Message[];
  onBranch: () => void;
  parentNotes: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {messages.map((m: Message, i) => (
        <div key={m._id} className="group/msg">
          {m.role !== "user" && <ReplySteps parentNotes={parentNotes} priorMessages={i} />}
          <MessageBubble message={m} />
          {m.role !== "user" && !m.isStreaming && <ReplyActions content={m.content} onBranch={onBranch} />}
        </div>
      ))}
    </div>
  );
}

/* What the model read before replying, the same context the backend
 * builds (convex/lib/context.ts): notes from the parent nodes, then this
 * branch's earlier messages. One row per step: check, step, muted detail. */
function ReplySteps({ parentNotes, priorMessages }: { parentNotes: string[]; priorMessages: number }) {
  const steps: { label: string; detail: string }[] = [];
  if (parentNotes.length > 0) {
    const names = parentNotes.slice(-2).join(" · ");
    const more = parentNotes.length - 2;
    steps.push({ label: "Read parent notes", detail: more > 0 ? `${names} +${more}` : names });
  }
  if (priorMessages > 0) {
    steps.push({ label: "Read the conversation", detail: `${priorMessages} ${priorMessages === 1 ? "message" : "messages"}` });
  }
  if (steps.length === 0) return null;
  return (
    <ul className="mb-3 flex flex-col gap-1.5" aria-label="Context">
      {steps.map((s) => (
        <li key={s.label} className="flex min-w-0 items-center gap-2.5 text-body-sm">
          <CheckIcon className="size-4 shrink-0 text-fg-tertiary" aria-hidden />
          <span className="shrink-0 text-fg-secondary">{s.label}</span>
          <span className="truncate text-fg-tertiary">{s.detail}</span>
        </li>
      ))}
    </ul>
  );
}

const hasNotes = (content: unknown) =>
  Array.isArray(content) &&
  blocksToPlainText(content as Parameters<typeof blocksToPlainText>[0]).trim().length > 0;

// Icon swap (interfaces.dev): the incoming icon grows from 0.25 and
// unblurs as the outgoing one does the reverse
const iconSwap =
  "absolute transition-[opacity,scale,filter] duration-200 ease-out motion-reduce:transition-opacity";
const iconIn = "scale-100 opacity-100 blur-0";
const iconOut = "scale-[0.25] opacity-0 blur-[4px]";

const replyAction =
  "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-body-sm text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4";

/* Under each finished reply: Branch from here, then icon actions. Copy
 * confirms with a check for a moment. */
function ReplyActions({ content, onBranch }: { content: string; onBranch: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => handleError(err, "Couldn't copy"));
  };
  return (
    <div className="mt-2 -ml-2 flex items-center gap-1">
      <button type="button" onClick={onBranch} className={replyAction}>
        <GitBranch />
        Branch from here
      </button>
      <span aria-hidden className="mx-1 h-4 w-px bg-border-default" />
      <Tip label={copied ? "Copied" : "Copy"}>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy"} className={cn(replyAction, "w-7 justify-center px-0")}>
          <span className="relative flex size-4 items-center justify-center">
            <Check className={cn(iconSwap, copied ? iconIn : iconOut)} />
            <Copy className={cn(iconSwap, copied ? iconOut : iconIn)} />
          </span>
        </button>
      </Tip>
    </div>
  );
}
