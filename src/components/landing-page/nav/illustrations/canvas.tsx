import React from "react";
import { motion } from "motion/react";
import { C, Solid, draw, drop } from "./shared";
import { Callout } from "./drafting";
import { box, camera, corners, square, type Footprint } from "./iso";

/**
 * Canvas: a wide, thin floor with tiles dropping onto it at scattered spots,
 * then links drawing between them along its surface. The last tile to land,
 * in the middle, holds the one bright edge. Callouts name the parent, a leaf
 * and an edge.
 */

const FLOOR: Footprint = [-56, -50, 54, 44];
const FLOOR_HEIGHT = 7;

/** Paint order: ascending x + y. `order` is when each one lands. */
const TILES = [
  { x: -38, y: -30, order: 0 },
  { x: 12, y: -36, order: 2 },
  { x: -2, y: -4, order: 4 },
  { x: -32, y: 22, order: 1 },
  { x: 32, y: 14, order: 3 },
];
const HERO = 2;
const TILE = { size: 16, height: 4 };

const LINKS: [number, number][] = [
  [0, 2],
  [1, 4],
  [2, 3],
  [2, 4],
];

const CAM = camera(1.25, [...corners(FLOOR, 0), ...corners(FLOOR, FLOOR_HEIGHT + TILE.height)], 120, 146);

const onFloor = (i: number) => CAM.P(TILES[i].x, TILES[i].y, FLOOR_HEIGHT).join(" ");

const STAGGER = 0.08;
const LANDED = Math.max(...TILES.map((t) => t.order)) * STAGGER + 0.4;
const ANNOTATE = LANDED + 0.45;

const top = (i: number) => CAM.P(TILES[i].x, TILES[i].y, FLOOR_HEIGHT + TILE.height);
const PARENT_TOP = top(HERO);
const LEAF_TOP = top(1);
const LINK_MID = CAM.P((TILES[2].x + TILES[3].x) / 2, (TILES[2].y + TILES[3].y) / 2, FLOOR_HEIGHT);

export function Canvas() {
  return (
    <g strokeWidth={1} strokeLinecap="round">
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Solid solid={box(CAM, FLOOR, 6, 3, 0, FLOOR_HEIGHT)} />
      </motion.g>

      {/* Links run under the tiles, which are painted over their ends. */}
      {LINKS.map(([a, b], i) => (
        <motion.path
          key={`${a}-${b}`}
          d={`M${onFloor(a)}L${onFloor(b)}`}
          fill="none"
          stroke={C.muted}
          {...draw(LANDED + i * 0.05, 0.4)}
        />
      ))}

      {TILES.map(({ x, y, order }, i) => (
        <motion.g key={i} {...drop(0.1 + order * STAGGER)}>
          <Solid
            solid={box(CAM, square(x, y, TILE.size), 2.5, 1.4, FLOOR_HEIGHT, FLOOR_HEIGHT + TILE.height)}
            edge={i === HERO ? C.ink : C.muted}
          />
        </motion.g>
      ))}

      <Callout n="1" label="Parent node" at={PARENT_TOP} to={[PARENT_TOP[0] - 14, 228]} delay={ANNOTATE} />
      <Callout n="2" label="Leaf node" at={LEAF_TOP} to={[LEAF_TOP[0] + 22, 40]} side="right" delay={ANNOTATE + 0.1} />
      <Callout n="3" label="Edge" at={LINK_MID} to={[LINK_MID[0] - 30, 70]} side="above" delay={ANNOTATE + 0.2} />
    </g>
  );
}
