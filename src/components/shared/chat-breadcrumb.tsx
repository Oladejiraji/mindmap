"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useNodesByThread, type Node } from "@/services/nodes/queries";
import { buildNodeMap, walkAncestors } from "@/lib/tree";
import type { Id } from "@convex/dataModel";

export function ChatBreadcrumb() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)(?:\/n\/([^/]+))?/);

  if (!match) return null;

  const threadId = match[1] as Id<"threads">;
  const nodeId = (match[2] ?? null) as Id<"nodes"> | null;

  return <ChatBreadcrumbInner threadId={threadId} nodeId={nodeId} />;
}

function ChatBreadcrumbInner({
  threadId,
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes"> | null;
}) {
  const { data: nodes } = useNodesByThread(threadId);

  const chain = useMemo<Node[]>(() => {
    if (!nodes || nodes.length === 0) return [];
    if (!nodeId) {
      const root = nodes.find((n) => n.parentId === null);
      return root ? [root] : [];
    }
    return walkAncestors(buildNodeMap(nodes), nodeId);
  }, [nodes, nodeId]);

  if (chain.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {chain.map((node, i) => {
          const isLast = i === chain.length - 1;
          return (
            <Fragment key={node._id}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="max-w-[200px] truncate">
                    {node.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="max-w-[160px] truncate"
                    render={<Link href={`/t/${threadId}/n/${node._id}`} />}
                  >
                    {node.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
