import React from "react";
import { motion } from "motion/react";
import { C, Solid, draw, drop } from "./shared";
import { Callout } from "./drafting";
import { box, camera, corners, plane, square } from "./iso";

/**
 * Node Chat: two ancestors stand at the back, each with
 * its context layer on top, the same bright layer a fork carries in Branches.
 * A copy of each lifts off, arcs over and stacks onto this node, then a chat
 * plate settles above it. The chat reads
 * what the node has gathered from its whole lineage.
 */

const SIZE = 22;
const ANCESTORS = [
  { x: -52, y: -16 },
  { x: -16, y: -52 },
];
const NODE = { x: 34, y: 34 };

/** An ancestor: a base with its context layer on top. */
const ANCESTOR = { base: 6, layer: [7.2, 9.6] as const };
/** This node: a base, then one gathered layer per ancestor, then the chat plate floating above. */
const BASE = 10;
const LAYERS = [
  [11.2, 13.6],
  [14.8, 17.2],
] as const;
const CHAT = [25, 27.4] as const;

const R = 3;
const CB = 1.6;

const foot = (x: number, y: number) => square(x, y, SIZE);

const CAM = camera(
  1.75,
  [
    ...ANCESTORS.flatMap(({ x, y }) => corners(foot(x, y), 0)),
    ...corners(foot(NODE.x, NODE.y), 0),
    ...corners(foot(NODE.x, NODE.y), CHAT[1]),
  ],
  120,
  140,
);

const half = SIZE / 2;

const T = { node: 0.3, gather: 0.8, chat: 2.05, annotate: 2.6 };
const GATHER = { duration: 0.75, stagger: 0.3, lift: 26 };

/** A copy of an ancestor's context layer, lifting off it and landing on the node. */
function Gathered({ from, layer, delay }: { from: number; layer: readonly [number, number]; delay: number }) {
  const { x, y } = ANCESTORS[from];
  const [ax, ay] = CAM.P(x, y, ANCESTOR.layer[1]);
  const [nx, ny] = CAM.P(NODE.x, NODE.y, layer[1]);
  const dx = ax - nx, dy = ay - ny;
  const path = { duration: GATHER.duration, delay, times: [0, 0.25, 0.7, 1], ease: "easeInOut" as const };
  return (
    <motion.g
      initial={{ x: dx, y: dy, opacity: 0 }}
      animate={{ x: [dx, dx, 0, 0], y: [dy, dy - GATHER.lift, -GATHER.lift, 0], opacity: 1 }}
      transition={{ x: path, y: path, opacity: { duration: 0.01, delay } }}
    >
      <Solid solid={box(CAM, foot(NODE.x, NODE.y), R, CB, layer[0], layer[1])} edge={C.ink} />
    </motion.g>
  );
}

/** Message lines lying on the chat plate's top, in the plate's own ground units. */
const MESSAGES = ["M4 6H15", "M7 11H18", "M4 16H12"];

function Chat() {
  const transform = plane(CAM, NODE.x - half, NODE.y - half, CHAT[1], 1);
  return (
    <>
      <motion.g {...drop(T.chat)}>
        <Solid solid={box(CAM, foot(NODE.x, NODE.y), R, CB, CHAT[0], CHAT[1])} edge={C.ink} />
      </motion.g>
      <g transform={transform}>
        {MESSAGES.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke={i === 1 ? C.ink : C.muted}
            fill="none"
            vectorEffect="non-scaling-stroke"
            {...draw(T.chat + 0.3 + i * 0.12, 0.3)}
          />
        ))}
      </g>
    </>
  );
}

export function NodeChat() {
  const rootTop = CAM.P(ANCESTORS[0].x, ANCESTORS[0].y, ANCESTOR.layer[1]);
  const layerFace = CAM.P(NODE.x + half, NODE.y + 2, (LAYERS[0][0] + LAYERS[0][1]) / 2);
  // The plate's leftmost edge, so the leader leaves it straight out to the left.
  const chatFace = CAM.P(NODE.x - half + 1, NODE.y + half - 1, (CHAT[0] + CHAT[1]) / 2);

  return (
    <g strokeWidth={1} strokeLinecap="round">
      {ANCESTORS.map(({ x, y }, i) => (
        <React.Fragment key={i}>
          <motion.g {...drop(i * 0.08)}>
            <Solid solid={box(CAM, foot(x, y), R, CB, 0, ANCESTOR.base)} />
          </motion.g>
          <motion.g {...drop(0.12 + i * 0.08)}>
            <Solid solid={box(CAM, foot(x, y), R, CB, ANCESTOR.layer[0], ANCESTOR.layer[1])} edge={C.ink} />
          </motion.g>
        </React.Fragment>
      ))}

      <motion.g {...drop(T.node)}>
        <Solid solid={box(CAM, foot(NODE.x, NODE.y), R, CB, 0, BASE)} />
      </motion.g>

      {LAYERS.map((layer, i) => (
        <Gathered key={i} from={i} layer={layer} delay={T.gather + i * GATHER.stagger} />
      ))}

      <Chat />

      <Callout n="1" label="Ancestors" at={rootTop} to={[rootTop[0], 46]} side="above" delay={T.annotate} />
      <Callout
        n="2"
        label="Inherited context"
        at={layerFace}
        to={[layerFace[0] + 6, layerFace[1] + 56]}
        delay={T.annotate + 0.15}
      />
      <Callout n="3" label="Chat" at={chatFace} to={[30, chatFace[1]]} delay={T.annotate + 0.3} />
    </g>
  );
}
