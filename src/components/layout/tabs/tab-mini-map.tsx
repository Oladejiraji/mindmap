"use client";

import { useMemo } from "react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { NODE_HEIGHT, NODE_WIDTH, layoutNodes } from "@/lib/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { RenderIf } from "@/components/shared/render-if";

/*
 * A project's map in miniature, for recognising it at a glance: its nodes
 * as blocks and the lines between them, laid out as on the canvas (moved
 * nodes included). Static. Loading the nodes here also warms the cache,
 * so opening the project is quicker.
 */

// Blocks are drawn shorter than a node's layout box, so the lines show.
const BLOCK_HEIGHT = NODE_HEIGHT * 0.6;
// Space around the map, in canvas units.
const PADDING = 80;

export function TabMiniMap({ threadId }: { threadId: Id<"threads"> }) {
  const { data: nodes } = useAuthedConvexQuery(api.nodes.listByThread, { threadId });

  const map = useMemo(() => {
    if (!nodes?.length) return null;
    const positions = layoutNodes(nodes);
    const at = (id: string) => positions.get(id) ?? { x: 0, y: 0 };
    const xs = nodes.map((n) => at(n._id).x);
    const ys = nodes.map((n) => at(n._id).y);
    const minX = Math.min(...xs) - PADDING;
    const minY = Math.min(...ys) - PADDING;
    const width = Math.max(...xs) + NODE_WIDTH + PADDING - minX;
    const height = Math.max(...ys) + BLOCK_HEIGHT + PADDING - minY;
    const blocks = nodes.map((n) => ({ id: n._id, root: n.parentId === null, ...at(n._id) }));
    // From the bottom middle of the parent to the top middle of the child.
    const lines = nodes.flatMap((n) => {
      if (!n.parentId) return [];
      const from = at(n.parentId);
      const to = at(n._id);
      const x1 = from.x + NODE_WIDTH / 2;
      const y1 = from.y + BLOCK_HEIGHT;
      const x2 = to.x + NODE_WIDTH / 2;
      const y2 = to.y;
      const mid = (y1 + y2) / 2;
      return [{ id: n._id, d: `M${x1} ${y1}C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}` }];
    });
    return { viewBox: `${minX} ${minY} ${width} ${height}`, blocks, lines };
  }, [nodes]);

  return (
    <div aria-hidden className="aspect-4/3 overflow-hidden rounded-xl bg-background-2">
      <RenderIf condition={!nodes}>
        <Skeleton className="size-full rounded-none bg-component-hover" />
      </RenderIf>
      <RenderIf condition={!!map}>
        <svg viewBox={map?.viewBox} preserveAspectRatio="xMidYMid meet" className="size-full">
          {map?.lines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              fill="none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="stroke-foreground/20"
            />
          ))}
          {map?.blocks.map((block) => (
            <rect
              key={block.id}
              x={block.x}
              y={block.y}
              width={NODE_WIDTH}
              height={BLOCK_HEIGHT}
              rx={24}
              className={block.root ? "fill-brand-solid" : "fill-foreground/15"}
            />
          ))}
        </svg>
      </RenderIf>
    </div>
  );
}
