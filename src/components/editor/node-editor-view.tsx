"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon } from "@/components/icons/chevron-down";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CloseIcon } from "@/components/icons/close-icon";
import { Plus as PlusIcon } from "lucide-react";
import { MaximizeIcon } from "@/components/icons/maximize-icons";
import { InfoIcon } from "@/components/icons/info-icon";
import { META_BLUE, MetaIcon } from "@/components/icons/meta-icon";
import { Popover } from "@base-ui/react/popover";
import { popupSurface } from "@/components/layout/sidebar/popover-styles";
import { ContentIcon } from "@/components/icons/content-icon";
import { UserAvatar } from "@/components/shared/user-avatar";
import { authClient } from "@/lib/auth-client";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import { formatRelativeTime } from "@/lib/format-time";
import { routes } from "@/lib/routes";
import { useEditPreview } from "@/lib/edit-preview";
import { NodeDocumentPane } from "./node-document-pane";
import { NodeChat } from "@/components/chat/node-chat";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { RenderIf } from "@/components/shared/render-if";

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
  onFullScreen,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
  onClose: () => void;
  /** Opens this node's chat full screen (the project's Chat view). */
  onFullScreen?: () => void;
}) {
  const { data: node, isPending } = useAuthedConvexQuery(api.nodes.get, {
    nodeId,
  });
  const { data: thread } = useAuthedConvexQuery(api.threads.get, { threadId });
  const { data: nodes } = useAuthedConvexQuery(api.nodes.listByThread, {
    threadId,
  });

  const hasContent = Boolean(node?.content?.trim());

  // ?tab=chat wins; otherwise an empty node opens on the chat. Re-picked
  // whenever the panel switches node or ?tab changes.
  const requestedTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>("content");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const pickKey = `${nodeId}:${requestedTab ?? ""}`;
  if (initializedFor !== pickKey && node) {
    setTab(
      requestedTab === "chat" || requestedTab === "content"
        ? requestedTab
        : hasContent
          ? "content"
          : "chat",
    );
    setInitializedFor(pickKey);
  }

  // A suggested edit to this node, if one is waiting.
  const preview = useEditPreview();
  const { data: pending } = useAuthedConvexQuery(api.proposals.pendingByThread, { threadId });
  const suggestion = pending?.find((p) => p.nodeId === nodeId);
  // Turning this node's preview back on shows it here, on the Content tab.
  // (Not when a suggestion arrives: that would pull you out of the chat.)
  const [seenShown, setSeenShown] = useState(preview.shown);
  if (seenShown !== preview.shown) {
    setSeenShown(preview.shown);
    if (suggestion && preview.shown?.proposalId === suggestion.proposalId) setTab("content");
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

  const closeButton = (
    <Tip
      label={
        <>
          Close <span className="text-white/50">Esc</span>
        </>
      }
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CloseIcon className="size-4" />
      </button>
    </Tip>
  );

  if (isPending || !node) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-end px-3">
          {closeButton}
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body-base text-fg-tertiary">
            {isPending ? "Loading…" : "Node not found"}
          </p>
        </div>
      </div>
    );
  }

  const parent = ancestors.at(-1);
  // Undefined on the root's own panel: it has no ancestors.
  const root = ancestors.at(0);
  const kind = !node.parentId ? "root" : children > 0 ? "branch" : "leaf";
  const kindLabel =
    kind === "root" ? "Root node" : kind === "branch" ? "Branch" : "Leaf";

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border-default pr-2 pl-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center text-body-sm font-medium text-fg-secondary">
            {/* The project crumb stands for the root node (the root's title
                is the project's name), so it opens the root's panel. On the
                root's own panel it's the current page, shown once below. */}
            {root && (
              <>
                <li className="min-w-0">
                  <Crumb href={routes.node(threadId, root._id)}>
                    {thread?.name ?? root.title}
                  </Crumb>
                </li>
                <Separator />
              </>
            )}
            {ancestors.length > 2 && (
              <>
                <li
                  className="px-1 text-fg-tertiary"
                  title={ancestors
                    .slice(1, -1)
                    .map((a) => a.title)
                    .join(" › ")}
                >
                  …
                </li>
                <Separator />
              </>
            )}
            {parent && parent.parentId && (
              <>
                <li className="min-w-0">
                  <Crumb href={routes.node(threadId, parent._id)}>
                    {parent.title}
                  </Crumb>
                </li>
                <Separator />
              </>
            )}
            <li className="min-w-0">
              <span
                aria-current="page"
                className="block truncate px-2 py-1 text-fg-primary"
              >
                {node.title}
              </span>
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 items-center">
          {/* Content toggle: shows the node's notes in place of its chat */}
          <Tip label={tab === "content" ? "Hide content" : "Show content"}>
            <button
              type="button"
              onClick={() => setTab(tab === "content" ? "chat" : "content")}
              aria-pressed={tab === "content"}
              aria-label="Content"
              className={cn(
                "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === "content"
                  ? "bg-transparent-hover text-fg-primary"
                  : "text-fg-tertiary",
              )}
            >
              <ContentIcon className="size-4" />
            </button>
          </Tip>
          <RenderIf condition={!!onFullScreen}>
            <Tip label="Open chat full screen">
              <button
                type="button"
                onClick={onFullScreen}
                aria-label="Open chat full screen"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <MaximizeIcon className="size-4" />
              </button>
            </Tip>
          </RenderIf>
          {closeButton}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Details */}
        <aside className="shrink-0 border-b border-border-default">
          <div className="px-5 py-4">
            {/* The node (a square, same size as the avatars), its
                collaborators and a dashed + to invite; node info on the right */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tip label={`${kindLabel} · ${node.title}`}>
                  <span
                    style={{ backgroundColor: META_BLUE }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
                  >
                    <MetaIcon className="size-4" />
                  </span>
                </Tip>
                <div className="flex items-center -space-x-1">
                  <CollaboratorAvatars size={28} />
                  <Tip label="Inviting collaborators isn't available yet">
                    <button
                      type="button"
                      aria-disabled
                      aria-label="Invite collaborators"
                      className="relative flex size-7 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-border-strong bg-background text-fg-tertiary ring-2 ring-background outline-none focus-visible:ring-ring/50"
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  </Tip>
                </div>
              </div>
              {/* Info: the node's summary and properties in a popover */}
              <Popover.Root>
                <Tip label="Node info">
                  <Popover.Trigger
                    aria-label="Node info"
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-tertiary outline-none transition-colors hover:bg-transparent-hover hover:text-fg-primary focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-transparent-hover data-popup-open:text-fg-primary"
                  >
                    <InfoIcon className="size-4" />
                  </Popover.Trigger>
                </Tip>
                <Popover.Portal>
                  <Popover.Positioner
                    side="bottom"
                    align="end"
                    sideOffset={6}
                    className="z-50"
                  >
                    <Popover.Popup
                      className={cn(popupSurface, "w-72 px-4 py-3")}
                    >
                      <p className="mb-2 text-caption-lg text-fg-tertiary">
                        {kindLabel}
                      </p>
                      {node.summary && (
                        <p className="mb-3 text-body-sm text-fg-secondary">
                          {node.summary}
                        </p>
                      )}
                      <dl className="grid grid-cols-[88px_minmax(0,1fr)] text-body-sm">
                        <Property label="Project">
                          <span className="truncate">
                            {thread?.name ?? "—"}
                          </span>
                        </Property>
                        <Property label="Parent">
                          {parent ? (
                            <Link
                              href={routes.node(threadId, parent._id)}
                              className="truncate hover:underline"
                            >
                              {parent.title}
                            </Link>
                          ) : (
                            <span className="text-fg-tertiary">None</span>
                          )}
                        </Property>
                        <Property label="Children">
                          {children === 1 ? "1 node" : `${children} nodes`}
                        </Property>
                        <Property label="Depth">
                          {depth === 0 ? "Root" : `Level ${depth}`}
                        </Property>
                        <Property label="Created">
                          {formatRelativeTime(node._creationTime)}
                        </Property>
                      </dl>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
          </div>
        </aside>

        {/* Content / Chat */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {tab === "content" ? (
              <NodeDocumentPane threadId={threadId} nodeId={nodeId} markdown={node.content ?? ""} />
            ) : (
              <NodeChat key={nodeId} nodeId={nodeId} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* The people on a node as overlapping avatars. Projects are single-owner
 * today, so it's just you. */
function CollaboratorAvatars({ size = 24 }: { size?: number }) {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? "You";
  const email = session?.user?.email ?? "";
  const people = [{ id: email || name, name, email }];
  return (
    <>
      {people.map((p) => (
        <span
          key={p.id}
          title={`${p.name} (owner)`}
          style={{ width: size, height: size }}
          className="relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-background"
        >
          <UserAvatar size={size} />
        </span>
      ))}
    </>
  );
}

function Crumb({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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
    <li
      role="presentation"
      aria-hidden
      className="flex w-3 shrink-0 items-center justify-center text-fg-disabled"
    >
      <ChevronRightIcon className="size-4" />
    </li>
  );
}

function Property({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="flex h-8 items-center text-fg-secondary">{label}</dt>
      <dd className="flex h-8 min-w-0 items-center text-fg-primary">
        {children}
      </dd>
    </>
  );
}
