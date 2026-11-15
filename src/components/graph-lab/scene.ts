import { LAYOUTS, layout, type LayoutId, type Vec3 } from "./layouts";
import { MAX_NODES, generateParents, mulberry32, viewTree, type ITreeView } from "./tree";

/**
 * The live graph: a spring simulation of every node, a slowly orbiting
 * camera, and a canvas renderer. It runs outside React; the lab page drives
 * it through the setters and reads nothing back except layout changes.
 *
 * The rules that make it read as Mindmap rather than "a network":
 * - Growth: nodes only appear from their parent and only leave by folding
 *   back into it.
 * - Identity: a node is the same node in every layout, so layouts morph.
 * - Lineage: one path, root to a leaf, is lit; everything else stays quiet.
 */

export interface IPalette {
  id: string;
  label: string;
  bg: string;
  /** Edge colour as an "r, g, b" triple, so its alpha can vary with depth. */
  edge: string;
  edgeAlpha: number;
  ink: string;
  nodeFill: string;
  /** Node colours by depth; the last one repeats. */
  nodes: string[];
}

export const PALETTES: IPalette[] = [
  {
    id: "mindmap",
    label: "Mindmap",
    bg: "#106CFB",
    edge: "255, 255, 255",
    edgeAlpha: 0.42,
    ink: "#FFFFFF",
    nodeFill: "#106CFB",
    nodes: ["#FFFFFF"],
  },
  {
    id: "paper",
    label: "Paper",
    bg: "#F2F2F2",
    edge: "20, 20, 30",
    edgeAlpha: 0.55,
    ink: "#14141E",
    nodeFill: "#F2F2F2",
    nodes: ["#2D0F5E", "#3B1680", "#4A1C96", "#4B3BC4", "#4D5BE0"],
  },
  {
    id: "ink",
    label: "Ink",
    bg: "#0A0B10",
    edge: "200, 210, 255",
    edgeAlpha: 0.3,
    ink: "#FFFFFF",
    nodeFill: "#0A0B10",
    nodes: ["#E8ECFF", "#C4D0FF", "#9FB2FF", "#7F95FF"],
  },
];

export type NodeStyle = "ring" | "dot";

export interface IStyle {
  palette: IPalette;
  nodeStyle: NodeStyle;
  /** 0 is straight edges; 1 bows them hard. */
  curve: number;
  /** Node radius in CSS px at the scene's centre depth. */
  nodeSize: number;
  lineage: boolean;
  autoplay: boolean;
  rotate: boolean;
}

interface INode {
  p: Vec3;
  v: Vec3;
  /** Where it's springing to now, and where it'll spring to from `switchAt`. */
  target: Vec3;
  next: Vec3;
  switchAt: number;
  alpha: number;
  alive: boolean;
  dying: boolean;
  /** 0–1: how lit it is as part of the lineage. */
  glow: number;
}

/** Each depth starts moving this much later than the one above it: the ripple. */
const STAGGER = 0.05;
const STIFFNESS = 70;
const DAMPING = 14;
const LINEAGE_EVERY = 4.5;
const AUTOPLAY_EVERY = 4;
const PULSE_EVERY = 2.4;
const CAMERA_DISTANCE = 3;

const newNode = (): INode => ({
  p: [0, 0, 0],
  v: [0, 0, 0],
  target: [0, 0, 0],
  next: [0, 0, 0],
  switchAt: 0,
  alpha: 0,
  alive: false,
  dying: false,
  glow: 0,
});

interface IProjected {
  x: number;
  y: number;
  /** Perspective scale and 0 (near) – 1 (far) depth. */
  s: number;
  far: number;
}

export class GraphScene {
  style: IStyle;
  layoutId: LayoutId;
  onLayoutChange?: (id: LayoutId) => void;

  private count: number;
  private parents: number[] = [];
  private tree!: ITreeView;
  private nodes: INode[] = Array.from({ length: MAX_NODES }, newNode);
  private time = 0;
  private yaw = 0.6;
  private pitch = 0.35;
  private pitchV = 0;
  private lineage: number[] = [];
  private lineageRng = mulberry32(0);
  private lineageAt = 0;
  private autoplayAt = AUTOPLAY_EVERY;

  constructor(seed: number, count: number, layoutId: LayoutId, style: IStyle) {
    this.count = count;
    this.layoutId = layoutId;
    this.style = style;
    this.setSeed(seed);
  }

  /** A new tree: everything folds away and the new one grows out of the root. */
  setSeed(seed: number) {
    this.parents = generateParents(seed);
    this.lineageRng = mulberry32(seed ^ 0x9e3779b9);
    this.lineage = [];
    for (const node of this.nodes) Object.assign(node, newNode());
    this.apply();
  }

  setCount(count: number) {
    this.count = count;
    this.apply();
  }

  setLayout(id: LayoutId) {
    this.layoutId = id;
    this.autoplayAt = this.time + AUTOPLAY_EVERY;
    this.apply();
  }

  private apply() {
    this.tree = viewTree(this.parents, this.count);
    const targets = layout(this.layoutId, this.tree);

    for (let i = 0; i < MAX_NODES; i++) {
      const node = this.nodes[i];
      if (i < this.count) {
        if (!node.alive) {
          // Born at its parent's current spot, waiting there until its turn.
          const from = i === 0 ? ([0, 0, 0] as Vec3) : this.nodes[this.parents[i]].p;
          node.p = [...from];
          node.v = [0, 0, 0];
          node.target = [...from];
          node.alpha = 0;
          node.alive = true;
        }
        node.dying = false;
        node.next = targets[i];
        node.switchAt = this.time + this.tree.depth[i] * STAGGER;
      } else if (node.alive) {
        node.dying = true;
      }
    }

    // Keep the lit path through a layout change: it's the same node.
    const leaf = this.lineage[this.lineage.length - 1];
    if (leaf === undefined || leaf >= this.count || this.tree.children[leaf].length > 0) this.pickLineage();
    else this.lineage = this.pathTo(leaf);
  }

  private pathTo(leaf: number) {
    const path = [leaf];
    while (path[0] !== 0) path.unshift(this.parents[path[0]]);
    return path;
  }

  private pickLineage() {
    const leaves = this.tree.leaves.filter((i) => i !== 0);
    if (leaves.length === 0) {
      this.lineage = [];
      return;
    }
    // Favour deep leaves: a long path reads better than a stub.
    const deep = leaves.filter((i) => this.tree.depth[i] >= this.tree.maxDepth - 1);
    const pool = deep.length > 0 ? deep : leaves;
    this.lineage = this.pathTo(pool[Math.floor(this.lineageRng() * pool.length)]);
    this.lineageAt = this.time + LINEAGE_EVERY;
  }

  step(rawDt: number) {
    // rAF's first timestamp can precede the clock reading taken at mount.
    const dt = Math.min(Math.max(rawDt, 0), 1 / 30);
    this.time += dt;

    if (this.style.autoplay && this.time >= this.autoplayAt) {
      const at = LAYOUTS.findIndex((l) => l.id === this.layoutId);
      const next = LAYOUTS[(at + 1) % LAYOUTS.length].id;
      this.setLayout(next);
      this.onLayoutChange?.(next);
    }
    if (this.time >= this.lineageAt) this.pickLineage();

    if (this.style.rotate) this.yaw += dt * 0.15;
    const pitchTarget = LAYOUTS.find((l) => l.id === this.layoutId)!.pitch;
    this.pitchV += (STIFFNESS * 0.3 * (pitchTarget - this.pitch) - DAMPING * 0.55 * this.pitchV) * dt;
    this.pitch += this.pitchV * dt;

    const onPath = new Set(this.style.lineage ? this.lineage : []);

    for (let i = 0; i < MAX_NODES; i++) {
      const node = this.nodes[i];
      if (!node.alive) continue;

      if (node.dying) {
        // Folds back into its parent as it fades.
        node.target = this.nodes[this.parents[i]].p;
        node.alpha -= dt * 3;
        if (node.alpha <= 0) {
          Object.assign(node, newNode());
          continue;
        }
      } else {
        if (this.time >= node.switchAt) {
          node.target = node.next;
          node.alpha = Math.min(1, node.alpha + dt * 4);
        }
      }

      for (let a = 0; a < 3; a++) {
        node.v[a] += (STIFFNESS * (node.target[a] - node.p[a]) - DAMPING * node.v[a]) * dt;
        node.p[a] += node.v[a] * dt;
      }
      node.glow += ((onPath.has(i) ? 1 : 0) - node.glow) * Math.min(1, dt * 5);
    }
  }

  /** Draws at the canvas's pixel size; `dpr` scales strokes and node sizes. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) {
    const { palette, nodeStyle, curve, nodeSize } = this.style;
    const R = Math.min(w, h) * 0.34;
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const t = this.time;

    const proj: (IProjected | null)[] = this.nodes.map((node, i) => {
      if (!node.alive) return null;
      // A slow drift, so it never sits completely still.
      const x = node.p[0] + Math.sin(t * 0.7 + i * 1.3) * 0.012;
      const y = node.p[1] + Math.cos(t * 0.6 + i * 0.7) * 0.012;
      const z = node.p[2] + Math.sin(t * 0.5 + i) * 0.012;
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const s = CAMERA_DISTANCE / (CAMERA_DISTANCE + z2);
      return {
        x: w / 2 + x1 * R * s,
        y: h / 2 - y2 * R * s,
        s,
        far: Math.min(1, Math.max(0, (z2 + 1.1) / 2.2)),
      };
    });

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";

    /** The edge into node i, bowed sideways by `curve`: start, control, end. */
    const edge = (i: number) => {
      const a = proj[this.parents[i]]!;
      const b = proj[i]!;
      const sign = i % 2 ? 1 : -1;
      const k = curve * 0.35 * sign;
      return {
        a,
        b,
        cx: (a.x + b.x) / 2 - (b.y - a.y) * k,
        cy: (a.y + b.y) / 2 + (b.x - a.x) * k,
      };
    };

    for (let i = 1; i < MAX_NODES; i++) {
      if (!proj[i] || !proj[this.parents[i]]) continue;
      const node = this.nodes[i];
      const { a, b, cx, cy: cyy } = edge(i);
      const fade = node.alpha * (1 - ((a.far + b.far) / 2) * 0.55);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx, cyy, b.x, b.y);
      ctx.strokeStyle = `rgba(${palette.edge}, ${palette.edgeAlpha * fade})`;
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      if (node.glow > 0.01) {
        ctx.globalAlpha = node.glow * node.alpha;
        ctx.strokeStyle = palette.ink;
        ctx.lineWidth = 1.8 * dpr;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // The pulse runs down the lineage, root to leaf.
    if (this.style.lineage && this.lineage.length > 1 && this.lineage.every((i) => proj[i])) {
      const u = ((t % PULSE_EVERY) / PULSE_EVERY) * (this.lineage.length - 1);
      const seg = Math.min(this.lineage.length - 2, Math.floor(u));
      const f = u - seg;
      const { a, b, cx, cy: cyy } = edge(this.lineage[seg + 1]);
      const x = (1 - f) * (1 - f) * a.x + 2 * (1 - f) * f * cx + f * f * b.x;
      const y = (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * cyy + f * f * b.y;
      ctx.beginPath();
      ctx.arc(x, y, 2.6 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = palette.ink;
      ctx.fill();
    }

    // Nodes back to front.
    const order = proj
      .map((p, i) => (p ? i : -1))
      .filter((i) => i >= 0)
      .sort((p, q) => proj[q]!.far - proj[p]!.far);

    for (const i of order) {
      const p = proj[i]!;
      const node = this.nodes[i];
      const depth = this.tree.depth[i] ?? this.tree.maxDepth;
      const sizeByDepth = i === 0 ? 1.6 : Math.max(0.7, 1.25 - depth * 0.09);
      const r = nodeSize * dpr * p.s * sizeByDepth * (1 + node.glow * 0.15);
      const base = palette.nodes[Math.min(depth, palette.nodes.length - 1)];
      const color = node.glow > 0.5 ? palette.ink : base;

      ctx.globalAlpha = node.alpha * (1 - p.far * 0.45);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (nodeStyle === "ring") {
        ctx.fillStyle = palette.nodeFill;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, r * 0.28);
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
