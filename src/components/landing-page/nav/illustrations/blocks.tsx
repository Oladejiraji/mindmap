import React from "react";
import { motion } from "motion/react";
import { C, Solid } from "./shared";
import { Callout, Dimension, Guide } from "./drafting";
import { box, camera, corners, type Footprint } from "./iso";

/**
 * Blocks: guides draw up the stack's edges, slabs drop into a stack, then
 * pull apart into an exploded view and get annotated. The heading, the
 * thicker top slab, holds the one bright edge.
 */

const PAGE: Footprint = [-26, -18, 26, 18];
const R = 4;
const GAP = 1.2;
/** Extra space between slabs once exploded, in world units. */
const EXPLODE = 11;

/** Bottom to top, which is also the paint order. */
const SLABS = [4, 4, 4, 4, 6.5];
const TOPS = SLABS.map((_, i) => SLABS.slice(0, i + 1).reduce((a, b) => a + b, 0) + i * (GAP + EXPLODE));
const HEIGHT = TOPS[TOPS.length - 1];

const S = 2;
const CAM = camera(S, [...corners(PAGE, 0), ...corners(PAGE, HEIGHT)], 122, 140);

/** Screen pixels per world unit of height (cos of the 2:1 view's elevation). */
const ZS = Math.sqrt(0.75) * S;

/** The silhouette's leftmost and rightmost edges, at height z. */
const [X0, Y0, X1, Y1] = PAGE;
const K = R * (1 - Math.SQRT1_2);
const left = (z: number) => CAM.P(X0 + K, Y1 - K, z);
const right = (z: number) => CAM.P(X1 - K, Y0 + K, z);

/** A point on a slab's front-left face, halfway up it: where a callout lands. */
const onFace = (i: number) => CAM.P(-12, Y1, TOPS[i] - SLABS[i] / 2);

const T = { drop: 0.45, explode: 1.25, annotate: 1.7 };

export function Blocks() {
  return (
    <g strokeWidth={1}>
      <Guide from={left(-6)} to={left(HEIGHT + 8)} />
      <Guide from={right(-6)} to={right(HEIGHT + 8)} delay={0.18} />

      {SLABS.map((thickness, i) => {
        const z1 = TOPS[i];
        const isTop = i === SLABS.length - 1;
        const delay = T.drop + i * 0.1;
        return (
          // Outer: the explode, from the collapsed stack up to its spot. Inner: the drop.
          <motion.g
            key={i}
            initial={{ y: i * EXPLODE * ZS }}
            animate={{ y: 0 }}
            transition={{ type: "spring", visualDuration: 0.5, bounce: 0.2, delay: T.explode + i * 0.04 }}
          >
            <motion.g
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                y: { type: "spring", visualDuration: 0.35, bounce: 0.25, delay },
                opacity: { duration: 0.12, delay },
              }}
            >
              <Solid solid={box(CAM, PAGE, R, 2, z1 - thickness, z1)} edge={isTop ? C.ink : C.muted} />
            </motion.g>
          </motion.g>
        );
      })}

      <Callout n="1" label="Heading" at={onFace(4)} to={[24, onFace(4)[1]]} delay={T.annotate} />
      <Callout n="2" label="Text" at={onFace(1)} to={[24, onFace(1)[1]]} delay={T.annotate + 0.15} />
      <Dimension a={right(0)} b={right(HEIGHT)} offset={[13, 0]} label="5 blocks" delay={T.annotate + 0.25} />
    </g>
  );
}
