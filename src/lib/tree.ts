import type { Id } from "@convex/dataModel";
import type { Node } from "@/services/nodes/queries";

export type FlatNode = Node & { depth: number; isLeaf: boolean };

const MAX_DEPTH = 100;

export function buildNodeMap(nodes: Node[]): Map<Id<"nodes">, Node> {
  return new Map(nodes.map((n) => [n._id, n]));
}

// Root → target. Empty array if the node isn't in the map.
export function walkAncestors(
  nodeMap: Map<Id<"nodes">, Node>,
  nodeId: Id<"nodes">,
): Node[] {
  const chain: Node[] = [];
  let current = nodeMap.get(nodeId);
  let depth = 0;
  while (current && depth < MAX_DEPTH) {
    chain.unshift(current);
    if (!current.parentId) break;
    current = nodeMap.get(current.parentId);
    depth++;
  }
  return chain;
}

export function collectSubtree(
  nodes: Node[],
  rootId: Id<"nodes">,
): Set<Id<"nodes">> {
  const childrenByParent = new Map<Id<"nodes">, Id<"nodes">[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const list = childrenByParent.get(n.parentId) ?? [];
      list.push(n._id);
      childrenByParent.set(n.parentId, list);
    }
  }

  const result = new Set<Id<"nodes">>();
  const queue: Id<"nodes">[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.add(current);
    for (const child of childrenByParent.get(current) ?? []) {
      queue.push(child);
    }
  }
  return result;
}

export function flattenTree(nodes: Node[]): FlatNode[] {
  const byParent = new Map<Id<"nodes"> | null, Node[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }

  const result: FlatNode[] = [];
  const walk = (parentId: Id<"nodes"> | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      const isLeaf = !byParent.has(node._id);
      result.push({ ...node, depth, isLeaf });
      walk(node._id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}
