import React from "react";
import { motion } from "motion/react";
import { C, Solid, drop } from "./shared";
import { Callout, Guide } from "./drafting";
import { box, camera, corners, square } from "./iso";

/**
 * Branches: a parent block lands with its context layer,
 * the why, on top. A dashed outline marks where its copy will go, the copy
 * slides out of the parent along a guide into that outline, carrying the
 * context layer with it, then a new slab lands on the copy alone: the fork's
 * own direction. The context layers, shared by both, hold the bright edge.
 */

const SIZE = 30;
const PARENT = { x: -28, y: 0 };
const COPY = { x: 28, y: 0 };

/** One block's layers, bottom to top. */
const BASE = { z0: 0, z1: 8 };
const CONTEXT = { z0: 9.2, z1: 12 };
const NEW = { z0: 13.2, z1: 16 };

const R = 3;
const CB = 1.6;

const CAM = camera(
  2.2,
  [PARENT, COPY].flatMap(({ x, y }) => [...corners(square(x, y, SIZE), 0), ...corners(square(x, y, SIZE), NEW.z1)]),
  120,
  146,
);

const T = { parent: 0.1, ghost: 0.55, slide: 0.85, diverge: 1.55, annotate: 2 };

/** A block's base and context layer, which is all a fork copies. */
function Layers({ x, y, delay }: { x: number; y: number; delay: number }) {
  const foot = square(x, y, SIZE);
  return (
    <>
      <motion.g {...drop(delay)}>
        <Solid solid={box(CAM, foot, R, CB, BASE.z0, BASE.z1)} />
      </motion.g>
      <motion.g {...drop(delay + 0.12)}>
        <Solid solid={box(CAM, foot, R, CB, CONTEXT.z0, CONTEXT.z1)} edge={C.ink} />
      </motion.g>
    </>
  );
}

export function Branches() {
  const [px, py] = CAM.P(PARENT.x, PARENT.y, 0);
  const [cx, cy] = CAM.P(COPY.x, COPY.y, 0);
  const half = SIZE / 2;

  const parentFace = CAM.P(PARENT.x - 4, PARENT.y + half, (BASE.z0 + BASE.z1) / 2);
  const contextFace = CAM.P(COPY.x + half, COPY.y + 4, (CONTEXT.z0 + CONTEXT.z1) / 2);

  return (
    <g strokeWidth={1} strokeLinecap="round">
      <Guide from={CAM.P(-66, 0, 0)} to={CAM.P(66, 0, 0)} delay={0} />

      <Layers {...PARENT} delay={T.parent} />

      {/* Where the copy will land, drawn before it moves. */}
      <motion.path
        d={box(CAM, square(COPY.x, COPY.y, SIZE), R, CB, 0, CONTEXT.z1).sil}
        fill="none"
        stroke={C.muted}
        strokeDasharray="2 3"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: T.ghost }}
      />

      {/* The copy starts on top of the parent and slides out along the guide. */}
      <motion.g
        initial={{ x: px - cx, y: py - cy, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{
          x: { type: "spring", visualDuration: 0.55, bounce: 0.15, delay: T.slide },
          y: { type: "spring", visualDuration: 0.55, bounce: 0.15, delay: T.slide },
          opacity: { duration: 0.01, delay: T.slide },
        }}
      >
        <Solid solid={box(CAM, square(COPY.x, COPY.y, SIZE), R, CB, BASE.z0, BASE.z1)} />
        <Solid solid={box(CAM, square(COPY.x, COPY.y, SIZE), R, CB, CONTEXT.z0, CONTEXT.z1)} edge={C.ink} />
      </motion.g>

      <motion.g {...drop(T.diverge)}>
        <Solid solid={box(CAM, square(COPY.x, COPY.y, SIZE), R, CB, NEW.z0, NEW.z1)} />
      </motion.g>

      <Callout n="1" label="Parent" at={parentFace} to={[parentFace[0] - 6, parentFace[1] + 52]} delay={T.annotate} />
      <Callout
        n="2"
        label="Inherited context"
        at={contextFace}
        to={[contextFace[0] - 4, contextFace[1] + 52]}
        delay={T.annotate + 0.15}
      />
    </g>
  );
}
