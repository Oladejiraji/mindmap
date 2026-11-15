import React from "react";
import { motion } from "motion/react";
import { C, Solid, draw, drop } from "./shared";
import { Callout, Guide } from "./drafting";
import { box, camera, corners, plane, square, type Footprint } from "./iso";

/**
 * Agents: a branch, its bright context layer on top, sits
 * on a build plate. A gantry rolls in along rails, pauses over the branch to
 * read it, then moves to the empty side of the plate and sweeps back and
 * forth as a new block builds up slab by slab: the code. It parks between
 * the two, and a plate with a check mark lands on the new block: the pull
 * request.
 */

const PLATE: Footprint = [-52, -24, 52, 24];
const PT = 3;
const RAIL = 18;

const SIZE = 22;
const BRANCH = { x: -26, y: 0 };
const BUILD = { x: 26, y: 0 };

const BRANCH_LAYERS = { base: [PT, PT + 8], context: [PT + 9.2, PT + 11.6] } as const;
const SLABS = [
  [PT, PT + 4],
  [PT + 5.2, PT + 9.2],
  [PT + 10.4, PT + 14.4],
] as const;
const CHECK = [PT + 15.6, PT + 17.6] as const;

/** The gantry, drawn at x = 0 and moved along x. */
const POST = 3;
const BEAM = [30, 33] as const;
const HEAD = { size: 8, z: [24, 29] as const };

const R = 3;
const CB = 1.6;

const CAM = camera(1.6, [...corners(PLATE, 0), ...corners(PLATE, BEAM[1])], 120, 146);

/** Screen pixels per world unit along x: the gantry's line of travel. */
const [x0, y0] = CAM.P(0, 0, 0), [x1, y1] = CAM.P(100, 0, 0);
const UX = (x1 - x0) / 100, UY = (y1 - y0) / 100;

const T = { plate: 0, branch: 0.15, gantry: 0.35, read: 0.75, arrive: 1.15, park: 2.2, check: 2.15, annotate: 2.6 };

/** Where the gantry is along x, and when: read the branch, sweep the build, park between. */
const TRAVEL = [
  [BRANCH.x, T.gantry],
  [BRANCH.x, T.read],
  [BUILD.x, T.arrive],
  [BUILD.x - 6, 1.35],
  [BUILD.x + 6, 1.55],
  [BUILD.x, 1.8],
  [0, T.park],
] as const;

function travel() {
  const start = TRAVEL[0][1], span = T.park - start;
  const at = TRAVEL.map(([gx]) => gx);
  const timing = { duration: span, delay: start, times: TRAVEL.map(([, t]) => (t - start) / span), ease: "easeInOut" as const };
  return {
    initial: { x: at[0] * UX, y: at[0] * UY },
    animate: { x: at.map((g) => g * UX), y: at.map((g) => g * UY) },
    transition: { x: timing, y: timing },
  };
}

const post = (y: number) => box(CAM, square(0, y, POST), 1, 0.6, PT, BEAM[0]);

/** The back post sits behind the blocks; the front post, beam and head in front. Both halves move together. */
function Gantry({ half }: { half: "back" | "front" }) {
  return (
    <motion.g {...travel()}>
      <motion.g {...drop(T.gantry)}>
        {half === "back" ? (
          <Solid solid={post(-RAIL)} />
        ) : (
          <>
            <Solid solid={post(RAIL)} />
            <Solid solid={box(CAM, [-2, -RAIL - 2, 2, RAIL + 2], 1, 0.6, BEAM[0], BEAM[1])} />
            <Solid solid={box(CAM, square(0, 0, HEAD.size), 1.5, 1, HEAD.z[0], HEAD.z[1])} edge={C.ink} />
          </>
        )}
      </motion.g>
    </motion.g>
  );
}

function Check() {
  const transform = plane(CAM, BUILD.x - SIZE / 2, BUILD.y - SIZE / 2, CHECK[1], 1);
  return (
    <motion.g {...drop(T.check)}>
      <Solid solid={box(CAM, square(BUILD.x, BUILD.y, SIZE), R, CB, CHECK[0], CHECK[1])} edge={C.ink} />
      <g transform={transform}>
        <motion.path
          d="M5 11.5L9.5 16L17.5 6.5"
          stroke={C.ink}
          fill="none"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          {...draw(T.check + 0.25, 0.3)}
        />
      </g>
    </motion.g>
  );
}

export function Agents() {
  const half = SIZE / 2;
  const branchFace = CAM.P(BRANCH.x - 4, BRANCH.y + half, (BRANCH_LAYERS.base[0] + BRANCH_LAYERS.base[1]) / 2);
  const head = CAM.P(0, 0, HEAD.z[1]);
  const checkFace = CAM.P(BUILD.x + half, BUILD.y + 2, (CHECK[0] + CHECK[1]) / 2);

  return (
    <g strokeWidth={1} strokeLinecap="round">
      <motion.g {...drop(T.plate)}>
        <Solid solid={box(CAM, PLATE, 5, 2.5, 0, PT)} />
      </motion.g>
      <Guide from={CAM.P(-46, -RAIL, PT)} to={CAM.P(46, -RAIL, PT)} delay={0.1} />
      <Guide from={CAM.P(-46, RAIL, PT)} to={CAM.P(46, RAIL, PT)} delay={0.18} />

      <Gantry half="back" />

      <motion.g {...drop(T.branch)}>
        <Solid solid={box(CAM, square(BRANCH.x, BRANCH.y, SIZE), R, CB, ...BRANCH_LAYERS.base)} />
      </motion.g>
      <motion.g {...drop(T.branch + 0.12)}>
        <Solid solid={box(CAM, square(BRANCH.x, BRANCH.y, SIZE), R, CB, ...BRANCH_LAYERS.context)} edge={C.ink} />
      </motion.g>

      {SLABS.map(([z0, z1], i) => (
        <motion.g key={i} {...drop(T.arrive + 0.05 + i * 0.22)}>
          <Solid solid={box(CAM, square(BUILD.x, BUILD.y, SIZE), R, CB, z0, z1)} />
        </motion.g>
      ))}
      <Check />

      <Gantry half="front" />

      <Callout n="1" label="Branch" at={branchFace} to={[branchFace[0] - 6, branchFace[1] + 58]} delay={T.annotate} />
      <Callout n="2" label="Agent" at={head} to={[head[0], 40]} side="right" delay={T.annotate + 0.15} />
      <Callout
        n="3"
        label="Pull request"
        at={checkFace}
        to={[checkFace[0] + 4, checkFace[1] + 66]}
        delay={T.annotate + 0.3}
      />
    </g>
  );
}
