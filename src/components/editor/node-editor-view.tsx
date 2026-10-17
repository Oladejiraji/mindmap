"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { ChevronRight } from "lucide-react";
import type { Block } from "@blocknote/core";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useNode, useNodesByThread } from "@/services/nodes/queries";
import { useThread } from "@/services/threads/queries";
import { handleError } from "@/lib/handle-error";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { BranchNodeIcon, LeafNodeIcon, RootNodeIcon } from "@/components/icons/node-icons";
import { BlockEditor } from "./block-editor";
import { NodeChat } from "@/components/chat/node-chat";
import { cn } from "@/lib/utils";
import { CanvasPanel } from "@/components/shared/canvas-panel";
import { SidebarToggleIcon } from "@/components/icons/sidebar-toggle";
import { useStoredBoolean } from "@/lib/use-stored-boolean";
import { useRegisterTab } from "@/lib/tabs";
import { TabStrip } from "@/components/shared/tab-strip";

/*
 * Node page, laid out like the interfere.com product dashboard:
 *   top bar     breadcrumb (project › ancestors › node), canvas link
 *   left        detail column: type tile, title, summary, property rows
 *   right       pill tabs (Content, Chat) over the active panel
 * The project panel is a collapsible 280px sidebar on the left, toggled
 * from the start of the top bar; the choice persists across visits.
 */

type Tab = "content" | "chat";

export function NodeEditorView({
  threadId,
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
}) {
  const { data: node, isPending } = useNode(nodeId);
  const { data: thread } = useThread(threadId);
  const { data: nodes } = useNodesByThread(threadId);
  const updateContent = useMutation(api.nodes.updateContent);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [sidebarOpen, setSidebarOpen] = useStoredBoolean("mindmap:node-sidebar", true);
  useRegisterTab(node ? { href: routes.node(threadId, nodeId), kind: "node", title: node.title } : null);

  const hasContent =
    node?.content &&
    Array.isArray(node.content) &&
    node.content.length > 0 &&
    !(
      node.content.length === 1 &&
      node.content[0].type === "paragraph" &&
      (!node.content[0].content || node.content[0].content.length === 0)
    );

  // ?tab=chat (from the canvas toggle) wins; otherwise an empty node opens
  // on the chat, as before.
  const requestedTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>("content");
  const [tabInitialized, setTabInitialized] = useState(false);
  if (!tabInitialized && node) {
    setTab(requestedTab === "chat" || requestedTab === "content" ? requestedTab : hasContent ? "content" : "chat");
    setTabInitialized(true);
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

  if (isPending || !node) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-body-base text-fg-tertiary">
          {isPending ? "Loading…" : "Node not found"}
        </p>
      </div>
    );
  }

  const parent = ancestors.at(-1);
  const kind = !node.parentId ? "root" : children > 0 ? "branch" : "leaf";
  const KindIcon = kind === "root" ? RootNodeIcon : kind === "branch" ? BranchNodeIcon : LeafNodeIcon;
  const kindLabel = kind === "root" ? "Root node" : kind === "branch" ? "Branch" : "Leaf";

  return (
    <div className="flex h-full bg-background">
      {/* Collapsible project sidebar */}
      <aside
        aria-label="Project"
        className={cn(
          "hidden shrink-0 overflow-hidden bg-sidebar transition-[width] duration-200 ease-out md:block",
          sidebarOpen ? "w-70" : "w-0",
        )}
      >
        <div className="h-full w-70 px-2 pt-2">
          <CanvasPanel variant="embedded" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-sidebar">
        <TabStrip className={sidebarOpen ? "md:px-0" : undefined} />
        <div className={cn("flex min-h-0 flex-1 flex-col bg-surface-container", sidebarOpen && "md:border-l md:border-border-default")}>
          {/* Top bar */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-default px-3">
            <div className="flex min-w-0 items-center gap-1">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                aria-expanded={sidebarOpen}
                className="hidden size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
              >
                <SidebarToggleIcon open={sidebarOpen} className="size-4" />
              </button>
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
                  {parent && (
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
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* Detail column */}
            <aside className="w-105 shrink-0 overflow-y-auto overscroll-contain border-r border-border-default">
              <div className="px-6 pt-8 pb-10">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-subtle text-brand-fg">
                  <KindIcon className="size-5" />
                </div>
                <p className="mt-6 text-caption-lg text-fg-tertiary">{kindLabel}</p>
                <h1 className="mt-1 text-heading-5 font-semibold text-pretty text-fg-primary">{node.title}</h1>
                {node.summary && <p className="mt-3 text-body-base text-fg-secondary">{node.summary}</p>}

                <dl className="mt-8 grid grid-cols-[112px_minmax(0,1fr)] gap-y-1 text-body-base">
                  <Property label="Project">
                    <Link href={routes.thread(threadId)} className="truncate hover:underline">
                      {thread?.name ?? "—"}
                    </Link>
                  </Property>
                  <Property label="Parent">
                    {parent ? (
                      <Link href={routes.node(threadId, parent._id)} className="truncate hover:underline">
                        {parent.title}
                      </Link>
                    ) : (
                      <span className="text-fg-tertiary">None</span>
                    )}
                  </Property>
                  <Property label="Children">{children === 1 ? "1 node" : `${children} nodes`}</Property>
                  <Property label="Depth">{depth === 0 ? "Root" : `Level ${depth}`}</Property>
                  <Property label="Created">{formatRelativeTime(node._creationTime)}</Property>
                </dl>
              </div>
            </aside>

            {/* Main column */}
            <section className="flex min-w-0 flex-1 flex-col">
              <div role="tablist" aria-label="Node views" className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border-default px-3">
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
                    <div className="mx-auto max-w-3xl px-8 py-8">
                      <BlockEditor
                        initialContent={Array.isArray(node.content) ? (node.content as Block[]) : undefined}
                        onChange={handleContentChange}
                      />
                    </div>
                  </div>
                ) : (
                  <NodeChat threadId={threadId} nodeId={nodeId} />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
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
