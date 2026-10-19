"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { ChevronRight, Plus, X } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { authClient } from "@/lib/auth-client";
import type { Block } from "@blocknote/core";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useNode, useNodesByThread } from "@/services/nodes/queries";
import { useThread } from "@/services/threads/queries";
import { handleError } from "@/lib/handle-error";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { NodeTabIcon } from "@/components/icons/node-tab-icon";
import { BlockEditor } from "./block-editor";
import { NodeChat } from "@/components/chat/node-chat";
import { cn } from "@/lib/utils";

/*
 * Node view, shown as a side panel over its project (?panel=<nodeId>)
 * rather than its own tab. Laid out like the interfere.com dashboard:
 * The panel is narrow, so everything stacks in one column:
 *   top bar     breadcrumb (project › ancestors › node), close
 *   details     type tile, title, summary, property rows
 *   tabs        pill tabs (Content, Chat) over the active view, filling the rest
 */

type Tab = "content" | "chat";

export function NodeEditorView({
  threadId,
  nodeId,
  onClose,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
  onClose: () => void;
}) {
  const { data: node, isPending } = useNode(nodeId);
  const { data: thread } = useThread(threadId);
  const { data: nodes } = useNodesByThread(threadId);
  const updateContent = useMutation(api.nodes.updateContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const hasContent =
    node?.content &&
    Array.isArray(node.content) &&
    node.content.length > 0 &&
    !(
      node.content.length === 1 &&
      node.content[0].type === "paragraph" &&
      (!node.content[0].content || node.content[0].content.length === 0)
    );

  // ?tab=chat wins; otherwise an empty node opens on the chat. Re-picked
  // whenever the panel switches to another node.
  const requestedTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>("content");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  if (initializedFor !== nodeId && node) {
    setTab(requestedTab === "chat" || requestedTab === "content" ? requestedTab : hasContent ? "content" : "chat");
    setInitializedFor(nodeId);
  }

  const { ancestors, children, depth } = useMemo(() => {
    if (!nodes) return { ancestors: [], children: 0, depth: 0 };
    const chain = walkAncestors(buildNodeMap(nodes), nodeId);
    return {
      ancestors: chain.slice(0, -1),
      children: nodes.filter((n) => n.parentId === nodeId).length,
      depth: Math.max(chain.length - 1, 0),
    };
  }, [nodes, nodeId]);

  const handleContentChange = useCallback(
    (blocks: Block[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateContent({ nodeId, content: blocks }).catch((err) =>
          handleError(err, "Failed to save content"),
        );
      }, 500);
    },
    [nodeId, updateContent],
  );

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close panel"
      title="Close (Esc)"
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <X className="size-4" />
    </button>
  );

  if (isPending || !node) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-end px-3">{closeButton}</header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body-base text-fg-tertiary">{isPending ? "Loading…" : "Node not found"}</p>
        </div>
      </div>
    );
  }

  const parent = ancestors.at(-1);
  const kind = !node.parentId ? "root" : children > 0 ? "branch" : "leaf";
  const kindLabel = kind === "root" ? "Root node" : kind === "branch" ? "Branch" : "Leaf";

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border-default pr-2 pl-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center text-body-sm font-medium text-fg-secondary">
            <li className="min-w-0">
              <Crumb href={routes.thread(threadId)}>{thread?.name ?? "Project"}</Crumb>
            </li>
            {ancestors.length > 1 && (
              <>
                <Separator />
                <li className="px-1 text-fg-tertiary" title={ancestors.slice(0, -1).map((a) => a.title).join(" › ")}>
                  …
                </li>
              </>
            )}
            {parent && parent.parentId && (
              <>
                <Separator />
                <li className="min-w-0">
                  <Crumb href={routes.node(threadId, parent._id)}>{parent.title}</Crumb>
                </li>
              </>
            )}
            <Separator />
            <li className="min-w-0">
              <span aria-current="page" className="block truncate px-2 py-1 text-fg-primary">
                {node.title}
              </span>
            </li>
          </ol>
        </nav>
        {closeButton}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Details */}
        <aside className="max-h-[45%] shrink-0 overflow-y-auto overscroll-contain border-b border-border-default">
          <div className="px-5 pt-5 pb-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-subtle text-brand-fg">
              <NodeTabIcon className="size-5" />
            </div>
            <p className="mt-5 text-body-sm text-fg-tertiary">{kindLabel}</p>
            <h1 className="mt-1 text-heading-5/6 font-semibold text-pretty text-fg-primary">{node.title}</h1>
            {node.summary && <p className="mt-3 text-body-sm text-fg-secondary">{node.summary}</p>}

            <dl className="mt-4 grid grid-cols-[104px_minmax(0,1fr)] text-body-sm">
              <Property label="Project">
                <span className="truncate">{thread?.name ?? "—"}</span>
              </Property>
              <Property label="Parent">
                {parent ? (
                  parent.parentId ? (
                    <Link href={routes.node(threadId, parent._id)} className="truncate hover:underline">
                      {parent.title}
                    </Link>
                  ) : (
                    <span className="truncate">{parent.title}</span>
                  )
                ) : (
                  <span className="text-fg-tertiary">None</span>
                )}
              </Property>
              <Property label="Children">{children === 1 ? "1 node" : `${children} nodes`}</Property>
              <Property label="Depth">{depth === 0 ? "Root" : `Level ${depth}`}</Property>
              <Property label="Created">{formatRelativeTime(node._creationTime)}</Property>
              <Property label="Collaborators">
                <Collaborators />
              </Property>
            </dl>
          </div>
        </aside>

        {/* Content / Chat */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div role="tablist" aria-label="Node views" className="flex h-12 shrink-0 items-center gap-1.5 px-3">
            {(["content", "chat"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "h-7 cursor-pointer rounded-lg px-2.5 text-body-sm font-medium capitalize outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  tab === t
                    ? "bg-transparent-hover text-fg-primary shadow-border"
                    : "text-fg-secondary shadow-border hover:bg-transparent-hover hover:text-fg-primary",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            {tab === "content" ? (
              <div className="h-full overflow-y-auto overscroll-contain">
                <div className="px-5 py-5">
                  <BlockEditor
                    key={nodeId}
                    initialContent={Array.isArray(node.content) ? (node.content as Block[]) : undefined}
                    onChange={handleContentChange}
                  />
                </div>
              </div>
            ) : (
              <NodeChat key={nodeId} threadId={threadId} nodeId={nodeId} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* Avatar stack with a dashed "+" at the end. Projects are single-owner
 * today, so the stack is just you; inviting needs a sharing model in the
 * backend, so the + is disabled until then. */
function Collaborators() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? "You";
  const email = session?.user?.email ?? "";
  const people = [{ id: email || name, name, email }];
  return (
    <span className="flex items-center -space-x-1.5">
      {people.map((p) => (
        <span
          key={p.id}
          title={`${p.name} (owner)`}
          className="relative flex size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-surface-container"
        >
          <UserAvatar size={24} />
        </span>
      ))}
      <button
        type="button"
        disabled
        aria-label="Invite collaborators"
        title="Inviting collaborators isn't available yet"
        className="relative flex size-6 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-container text-fg-tertiary ring-2 ring-surface-container"
      >
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}

function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block truncate rounded-md px-2 py-1 outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

function Separator() {
  return (
    <li role="presentation" aria-hidden className="flex w-3 shrink-0 items-center justify-center text-fg-disabled">
      <ChevronRight className="size-4" />
    </li>
  );
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="flex h-8 items-center text-fg-secondary">{label}</dt>
      <dd className="flex h-8 min-w-0 items-center text-fg-primary">{children}</dd>
    </>
  );
}
