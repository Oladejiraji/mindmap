/**
 * The graph's structure: a seeded tree, generated once per seed up to
 * MAX_NODES. It is prefix-stable: the first n nodes are the same for any
 * count, so changing the count grows or prunes the tree instead of
 * reshuffling it, and every node keeps its identity across layouts.
 */

export const MAX_NODES = 200;
const MAX_CHILDREN = 4;
const MAX_DEPTH = 6;

/** Small, fast, seedable PRNG: same seed, same sequence. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Each node's parent index; the root's is -1. */
export function generateParents(seed: number): number[] {
  const rng = mulberry32(seed);
  const parents = [-1];
  const childCount = [0];
  const depth = [0];

  for (let i = 1; i < MAX_NODES; i++) {
    let p = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      // Mostly extend a recent node, which deepens a branch; otherwise pick
      // any earlier one, biased shallow, which starts a new branch.
      p =
        rng() < 0.4
          ? Math.max(0, i - 1 - Math.floor(rng() * 3))
          : Math.floor(Math.pow(rng(), 1.3) * i);
      if (childCount[p] < MAX_CHILDREN && depth[p] < MAX_DEPTH) break;
    }
    parents.push(p);
    childCount[p]++;
    childCount.push(0);
    depth.push(depth[p] + 1);
  }

  return parents;
}

export interface ITreeView {
  n: number;
  parent: number[];
  depth: number[];
  children: number[][];
  /** Leaves in depth-first order, so each subtree's leaves are contiguous. */
  leaves: number[];
  /** Each node's share of the leaf order: [start, span] in 0–1. */
  wedge: [number, number][];
  maxDepth: number;
}

/** The first n nodes, with what the layouts need. */
export function viewTree(parents: number[], n: number): ITreeView {
  const parent = parents.slice(0, n);
  const children: number[][] = parent.map(() => []);
  const depth = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    children[parent[i]].push(i);
    depth[i] = depth[parent[i]] + 1;
  }

  const leaves: number[] = [];
  const order: number[] = [];
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    order.push(i);
    if (children[i].length === 0) leaves.push(i);
    for (let c = children[i].length - 1; c >= 0; c--) stack.push(children[i][c]);
  }

  const leafCount = new Array<number>(n).fill(0);
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k];
    leafCount[i] = children[i].length === 0 ? 1 : children[i].reduce((s, c) => s + leafCount[c], 0);
  }

  const wedge = new Array<[number, number]>(n);
  wedge[0] = [0, 1];
  for (const i of order) {
    let start = wedge[i][0];
    for (const c of children[i]) {
      const span = (wedge[i][1] * leafCount[c]) / leafCount[i];
      wedge[c] = [start, span];
      start += span;
    }
  }

  return { n, parent, depth, children, leaves, wedge, maxDepth: Math.max(1, ...depth) };
}
