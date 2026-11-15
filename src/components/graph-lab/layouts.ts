import type { ITreeView } from "./tree";

/**
 * Layouts place the same tree in 3D, in a unit-ish volume centred on the
 * origin (y up). They only compute positions: the scene springs every node
 * from wherever it is to its new spot, which is what makes them morph.
 */

export type Vec3 = [number, number, number];
export type LayoutId = "radial" | "dendrite" | "orbit";

export const LAYOUTS: { id: LayoutId; label: string; pitch: number }[] = [
  { id: "radial", label: "Radial", pitch: 0.35 },
  { id: "dendrite", label: "Dendrite", pitch: 0.12 },
  { id: "orbit", label: "Orbit", pitch: 0.95 },
];

const TAU = Math.PI * 2;
const mid = ([start, span]: [number, number]) => start + span / 2;

const normalize = ([x, y, z]: Vec3): Vec3 => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

/** Two unit vectors perpendicular to d, to fan children around it. */
function basis(d: Vec3): [Vec3, Vec3] {
  const up: Vec3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize([d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]]);
  const v: Vec3 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  return [u, v];
}

/**
 * Radial: a 3D burst, like a dandelion or a neuron. The root's branches
 * leave in directions spread evenly over a sphere; every other node forks
 * off its parent's heading, its siblings fanned round it. Each step out is
 * one depth's length, so leaves reach roughly the same shell.
 */
function radial(t: ITreeView): Vec3[] {
  const pos: Vec3[] = new Array(t.n);
  const dir: Vec3[] = new Array(t.n);
  const step = 0.95 / t.maxDepth;
  pos[0] = [0, 0, 0];
  dir[0] = [0, 1, 0];

  // Parents always come before their children, so one pass in index order works.
  for (let i = 1; i < t.n; i++) {
    const p = t.parent[i];
    const siblings = t.children[p];
    const k = siblings.indexOf(i);
    if (p === 0) {
      // Even spread over the sphere (a Fibonacci lattice).
      const y = 1 - (2 * (k + 0.5)) / siblings.length;
      const r = Math.sqrt(1 - y * y);
      const a = k * 2.39996;
      dir[i] = [r * Math.cos(a), y, r * Math.sin(a)];
    } else {
      const [u, v] = basis(dir[p]);
      const a = (k / siblings.length) * TAU + i;
      const spread = siblings.length > 1 ? 0.55 : 0.2;
      dir[i] = normalize([
        dir[p][0] + spread * (Math.cos(a) * u[0] + Math.sin(a) * v[0]),
        dir[p][1] + spread * (Math.cos(a) * u[1] + Math.sin(a) * v[1]),
        dir[p][2] + spread * (Math.cos(a) * u[2] + Math.sin(a) * v[2]),
      ]);
    }
    pos[i] = [pos[p][0] + dir[i][0] * step, pos[p][1] + dir[i][1] * step, pos[p][2] + dir[i][2] * step];
  }

  return pos;
}

/** Dendrite: grows up from a root at the bottom, each subtree in its own slice, with a slight twist. */
function dendrite(t: ITreeView): Vec3[] {
  return t.parent.map((_, i) => {
    const h = t.depth[i] / t.maxDepth;
    const a = mid(t.wedge[i]) * TAU + h * 0.6;
    const r = 0.85 * Math.pow(h, 0.75);
    return [r * Math.cos(a), -0.95 + 1.9 * h, r * Math.sin(a)];
  });
}

/** Orbit: one ring per depth, seen from above, each tilted a touch more, like a gyroscope. */
function orbit(t: ITreeView): Vec3[] {
  return t.parent.map((_, i) => {
    const r = t.depth[i] / t.maxDepth;
    const a = mid(t.wedge[i]) * TAU;
    const tilt = t.depth[i] * 0.1;
    const z = r * Math.sin(a);
    return [r * Math.cos(a), -z * Math.sin(tilt), z * Math.cos(tilt)];
  });
}

export function layout(id: LayoutId, t: ITreeView): Vec3[] {
  if (id === "dendrite") return dendrite(t);
  if (id === "orbit") return orbit(t);
  return radial(t);
}
