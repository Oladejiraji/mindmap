import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { C, Solid, draw, drop } from "./shared";
import { box, camera, corners, plane, square, type Footprint } from "./iso";
import { GITHUB_PATH, JIRA_PATH, LINEAR_PATH, MCP_PATH, SLACK_PATH } from "@/components/icons";

/**
 * Connect: a platform holds your tree, its bright context layer on top, and
 * an empty socket marked out in dashes. The integration, a module with its
 * logo on top, drops into the socket, a channel lights from socket to tree,
 * and pings run along it.
 *
 * One scene serves every integration: moving between them lifts the old
 * module out of the socket and drops the new one in.
 */

export type ConnectLogo = "github" | "linear" | "slack" | "jira" | "mcp";

/** Each logo's path data and its viewBox size. */
const LOGOS: Record<ConnectLogo, { path: string; size: number }> = {
  github: { path: GITHUB_PATH, size: 24 },
  linear: { path: LINEAR_PATH, size: 96 },
  slack: { path: SLACK_PATH, size: 24 },
  jira: { path: JIRA_PATH, size: 24 },
  mcp: { path: MCP_PATH, size: 24 },
};

const PLATFORM: Footprint = [-50, -30, 50, 30];
const PT = 4;

const TREE = { x: -24, y: -8, size: 22, base: [PT, PT + 8], context: [PT + 9.2, PT + 11.6] } as const;
const SOCKET = { x: 24, y: 10, size: 30 };
const MODULE = { size: 24, height: 10 };
const LOGO_SIZE = 16;

const R = 3;
const CB = 1.6;

const CAM = camera(1.75, [...corners(PLATFORM, 0), ...corners(PLATFORM, PT + MODULE.height)], 120, 140);

/** The channel along the platform: out of the tree along x, then along y into the socket. */
const CHANNEL = [CAM.P(TREE.x, TREE.y, PT), CAM.P(SOCKET.x, TREE.y, PT), CAM.P(SOCKET.x, SOCKET.y, PT)];

const T = { platform: 0, tree: 0.15, socket: 0.35, module: 0.6, channel: 0.95, ping: 1.4 };
const PING = { travel: 1, cycle: 2 };

function Ping() {
  const xs = CHANNEL.map(([x]) => x), ys = CHANNEL.map(([, y]) => y);
  const travel = {
    duration: PING.travel,
    delay: T.ping,
    repeat: Infinity,
    repeatDelay: PING.cycle - PING.travel,
    ease: "easeInOut" as const,
    times: [0, 0.5, 1],
  };
  return (
    // Starts under the tree and ends under the module, so it's never seen waiting.
    <motion.circle
      cx={0}
      cy={0}
      r={2.2}
      fill={C.ink}
      initial={{ x: xs[0], y: ys[0] }}
      animate={{ x: xs, y: ys }}
      transition={{ x: travel, y: travel }}
    />
  );
}

function Logo({ logo }: { logo: ConnectLogo }) {
  const { path, size } = LOGOS[logo];
  const transform = plane(CAM, SOCKET.x - LOGO_SIZE / 2, SOCKET.y - LOGO_SIZE / 2, PT + MODULE.height, LOGO_SIZE / size);
  return (
    <g transform={transform}>
      <path d={path} fill={C.ink} />
    </g>
  );
}

/** The module in the socket. Lifts out and fades on a swap; the next one drops in once it's gone. */
function Module({ logo }: { logo: ConnectLogo }) {
  return (
    <motion.g {...drop(T.module)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.g
          key={logo}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0, transition: { type: "spring", visualDuration: 0.3, bounce: 0.25 } }}
          exit={{ opacity: 0, y: -16, transition: { duration: 0.16, ease: "easeIn" } }}
        >
          <Solid solid={box(CAM, square(SOCKET.x, SOCKET.y, MODULE.size), R, CB, PT, PT + MODULE.height)} />
          <Logo logo={logo} />
        </motion.g>
      </AnimatePresence>
    </motion.g>
  );
}

export function Connect({ logo = "github" }: { logo?: ConnectLogo }) {
  return (
    <g strokeWidth={1} strokeLinecap="round">
      <motion.g {...drop(T.platform)}>
        <Solid solid={box(CAM, PLATFORM, 5, 2.5, 0, PT)} />
      </motion.g>

      {/* The empty socket, marked out before anything fills it. */}
      <motion.path
        d={box(CAM, square(SOCKET.x, SOCKET.y, SOCKET.size), R, CB, PT, PT).sil}
        fill="none"
        stroke={C.muted}
        strokeDasharray="2 3"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: T.socket }}
      />

      {/* Runs under the tree and the module, which are painted over its ends. */}
      <motion.path
        d={`M${CHANNEL.map((p) => p.join(" ")).join("L")}`}
        stroke={C.ink}
        fill="none"
        strokeLinejoin="round"
        {...draw(T.channel, 0.45)}
      />
      <Ping />

      <motion.g {...drop(T.tree)}>
        <Solid solid={box(CAM, square(TREE.x, TREE.y, TREE.size), R, CB, ...TREE.base)} />
      </motion.g>
      <motion.g {...drop(T.tree + 0.12)}>
        <Solid solid={box(CAM, square(TREE.x, TREE.y, TREE.size), R, CB, ...TREE.context)} edge={C.ink} />
      </motion.g>

      <Module logo={logo} />
    </g>
  );
}
