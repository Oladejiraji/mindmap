import dagre from "@dagrejs/dagre";
import type { Doc } from "@convex/dataModel";

const NODE_WIDTH = 360;
/** A node with content, at its tallest (the content box stops growing at 160px). */
const NODE_HEIGHT = 210;
/** A node without content. */
const EMPTY_NODE_HEIGHT = 90;
/** Space between siblings, and between a parent and its children. */
const GAP_X = 40;
const GAP_Y = 80;

export interface LayoutPosition {
  x: number;
  y: number;
}

/** A node on the canvas: where it is and how big. */
export interface NodeBox extends LayoutPosition {
  id: string;
  width: number;
  height: number;
}

/** A node's height before it's been drawn and measured. */
export function estimatedHeight(node: Doc<"nodes">) {
  return node.content?.trim() ? NODE_HEIGHT : EMPTY_NODE_HEIGHT;
}

/**
 * The tree laid out top to bottom with dagre, every node placed. Nodes in
 * a row share a top edge (dagre would centre them), so the row reads
 * as one line however tall each node is.
 */
function treeLayout(
  nodes: Doc<"nodes">[],
  heightOf: (node: Doc<"nodes">) => number,
): Map<string, LayoutPosition> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: GAP_X, ranksep: GAP_Y, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  // Oldest first, so siblings run left to right in the order they were made.
  const ordered = nodes.toSorted((a, b) => a._creationTime - b._creationTime);
  for (const node of ordered) {
    g.setNode(node._id, { width: NODE_WIDTH, height: heightOf(node) });
  }
  for (const node of ordered) {
    if (node.parentId) g.setEdge(node.parentId, node._id);
  }
  dagre.layout(g);

  // A row's nodes share a centre line; its top is half the tallest above it.
  const rowHeight = new Map<number, number>();
  for (const node of ordered) {
    const { y, height } = g.node(node._id);
    rowHeight.set(y, Math.max(rowHeight.get(y) ?? 0, height));
  }
  const positions = new Map<string, LayoutPosition>();
  for (const node of ordered) {
    const { x, y } = g.node(node._id);
    positions.set(node._id, { x: x - NODE_WIDTH / 2, y: y - rowHeight.get(y)! / 2 });
  }
  return positions;
}

/**
 * Where each node goes when the map first draws: where it was put (dragged
 * or placed when made), or else where the tree layout puts it.
 */
export function layoutNodes(nodes: Doc<"nodes">[]): Map<string, LayoutPosition> {
  const laidOut = treeLayout(nodes, estimatedHeight);
  return new Map(nodes.map((node) => [node._id, node.position ?? laidOut.get(node._id)!]));
}

/**
 * The whole map laid out neatly, ignoring where nodes were put. Heights
 * come from `heightOf` (measured on the canvas, where known).
 */
export function tidyLayout(
  nodes: Doc<"nodes">[],
  heightOf: (node: Doc<"nodes">) => number,
): Map<string, LayoutPosition> {
  return treeLayout(nodes, heightOf);
}

/**
 * Where a new child of `parent` goes: right of its last sibling, or under
 * the parent if it's the first. If that's taken, it moves right until it
 * isn't. Nothing else moves. Room is kept for the child to grow to full
 * height.
 */
export function placeBranch(parent: NodeBox, siblings: NodeBox[], all: NodeBox[]): LayoutPosition {
  let x = parent.x;
  let y = parent.y + parent.height + GAP_Y;
  const last = siblings.reduce<NodeBox | null>((a, b) => (!a || b.x > a.x ? b : a), null);
  if (last) {
    x = last.x + last.width + GAP_X;
    y = last.y;
  }
  const clear = (x: number) =>
    all.every(
      (b) =>
        x + NODE_WIDTH + GAP_X / 2 <= b.x ||
        x >= b.x + b.width + GAP_X / 2 ||
        y + NODE_HEIGHT + GAP_Y / 2 <= b.y ||
        y >= b.y + b.height + GAP_Y / 2,
    );
  // Bounded, in case the map is very wide.
  for (let i = 0; i < 200 && !clear(x); i++) x += NODE_WIDTH + GAP_X;
  return { x, y };
}

/**
 * Where `count` new children of `parentId` go, one after another, as
 * placeBranch would put them. From the saved and laid-out positions (not
 * what's measured on screen), so the canvas's preview of suggested
 * branches and accepting them agree on where they land.
 */
export function placeBranches(nodes: Doc<"nodes">[], parentId: string, count: number): LayoutPosition[] {
  const positions = layoutNodes(nodes);
  const boxes: NodeBox[] = nodes.map((node) => ({
    id: node._id,
    ...positions.get(node._id)!,
    width: NODE_WIDTH,
    height: estimatedHeight(node),
  }));
  const parent = boxes.find((box) => box.id === parentId);
  if (!parent) return [];
  const siblings = boxes.filter((box) => nodes.find((n) => n._id === box.id)?.parentId === parentId);
  const out: LayoutPosition[] = [];
  for (let i = 0; i < count; i++) {
    const position = placeBranch(parent, siblings, boxes);
    const box = { id: `new-${i}`, ...position, width: NODE_WIDTH, height: NODE_HEIGHT };
    siblings.push(box);
    boxes.push(box);
    out.push(position);
  }
  return out;
}

export { NODE_WIDTH, NODE_HEIGHT };
