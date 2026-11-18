/*
 * The outline of the active tab and the panel below it as one shape, so
 * they read as a single surface:
 *
 *        ╭──────────╮
 *        │  tab     │
 *   ╭────╯          ╰──────────────╮   ← feet: concave curves into the panel
 *   │            panel             │
 *   ╰──────────────────────────────╯
 *
 * Near the panel's left or right edge, the foot and the panel's corner
 * share the room left and shrink together, so a tab flush with the edge
 * runs straight down into it. Coordinates are px from the strip's top-left.
 */

export type SurfaceGeometry = {
  width: number;
  height: number;
  /** Where the panel starts (the strip's height). */
  top: number;
  tabLeft: number;
  /** 0 when no tab is active: just the panel. */
  tabWidth: number;
  tabHeight: number;
  /** The panel's corners. */
  radius: number;
  /** The tab's top corners and its feet. */
  tabRadius: number;
  /** Caps on the panel's top corners beside the tab (see surfaceCorners), e.g. held during a drag. */
  maxCornerLeft?: number;
  maxCornerRight?: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const f = (n: number) => Math.round(n * 100) / 100;

/** The panel's top-left and top-right corner radii for this tab position. */
export function surfaceCorners(g: SurfaceGeometry) {
  const R = Math.min(g.radius, (g.height - g.top) / 2, g.width / 2);
  const x0 = clamp(g.tabLeft, 0, g.width);
  const x1 = clamp(g.tabLeft + g.tabWidth, 0, g.width);
  if (x1 - x0 < 1) return { left: R, right: R };
  // Room on each side of the tab, shared by the foot and the panel corner.
  const footL = Math.min(g.tabRadius, x0);
  const footR = Math.min(g.tabRadius, g.width - x1);
  return {
    left: Math.max(0, Math.min(R, x0 - footL, g.maxCornerLeft ?? Infinity)),
    right: Math.max(0, Math.min(R, g.width - x1 - footR, g.maxCornerRight ?? Infinity)),
  };
}

export function surfacePath(g: SurfaceGeometry): string {
  const { width: W, height: H, top: T, tabHeight } = g;
  if (W <= 0 || H <= T) return "";
  const R = Math.min(g.radius, (H - T) / 2, W / 2);
  const x0 = clamp(g.tabLeft, 0, W);
  const x1 = clamp(g.tabLeft + g.tabWidth, 0, W);

  const bottom = [`L ${f(W)} ${f(H - R)}`, `A ${f(R)} ${f(R)} 0 0 1 ${f(W - R)} ${f(H)}`, `L ${f(R)} ${f(H)}`, `A ${f(R)} ${f(R)} 0 0 1 0 ${f(H - R)}`, "Z"];

  if (x1 - x0 < 1) {
    return [
      `M 0 ${f(H - R)}`,
      `L 0 ${f(T + R)}`,
      `A ${f(R)} ${f(R)} 0 0 1 ${f(R)} ${f(T)}`,
      `L ${f(W - R)} ${f(T)}`,
      `A ${f(R)} ${f(R)} 0 0 1 ${f(W)} ${f(T + R)}`,
      ...bottom,
    ].join(" ");
  }

  const yTop = T - tabHeight;
  const rt = Math.min(g.tabRadius, (x1 - x0) / 2, tabHeight / 2);
  const footL = Math.min(g.tabRadius, x0);
  const footR = Math.min(g.tabRadius, W - x1);
  const { left: cornerL, right: cornerR } = surfaceCorners(g);

  return [
    `M 0 ${f(H - R)}`,
    `L 0 ${f(T + cornerL)}`,
    cornerL > 0 ? `A ${f(cornerL)} ${f(cornerL)} 0 0 1 ${f(cornerL)} ${f(T)}` : "",
    `L ${f(x0 - footL)} ${f(T)}`,
    footL > 0 ? `A ${f(footL)} ${f(footL)} 0 0 0 ${f(x0)} ${f(T - footL)}` : "",
    `L ${f(x0)} ${f(yTop + rt)}`,
    `A ${f(rt)} ${f(rt)} 0 0 1 ${f(x0 + rt)} ${f(yTop)}`,
    `L ${f(x1 - rt)} ${f(yTop)}`,
    `A ${f(rt)} ${f(rt)} 0 0 1 ${f(x1)} ${f(yTop + rt)}`,
    `L ${f(x1)} ${f(T - footR)}`,
    footR > 0 ? `A ${f(footR)} ${f(footR)} 0 0 0 ${f(x1 + footR)} ${f(T)}` : "",
    `L ${f(W - cornerR)} ${f(T)}`,
    cornerR > 0 ? `A ${f(cornerR)} ${f(cornerR)} 0 0 1 ${f(W)} ${f(T + cornerR)}` : "",
    ...bottom,
  ]
    .filter(Boolean)
    .join(" ");
}
