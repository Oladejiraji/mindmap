import dagre from "@dagrejs/dagre";
import type { Node } from "@/services/nodes/queries";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

export interface LayoutPosition {
  x: number;
  y: number;
}

/**
 * Compute auto-layout positions using dagre, then merge with
 * any stored position overrides (the hybrid model from the spec).
 */
export function layoutNodes(
  nodes: Node[]
): Map<string, LayoutPosition> {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node._id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const node of nodes) {
    if (node.parentId) {
      g.setEdge(node.parentId, node._id);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, LayoutPosition>();
  for (const node of nodes) {
    const stored = node.position;
    if (stored) {
      positions.set(node._id, stored);
    } else {
      const layoutNode = g.node(node._id);
      positions.set(node._id, {
        x: layoutNode.x - NODE_WIDTH / 2,
        y: layoutNode.y - NODE_HEIGHT / 2,
      });
    }
  }

  return positions;
}

export { NODE_WIDTH, NODE_HEIGHT };
