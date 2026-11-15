"use client";
import React from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { VIEW_BOX } from "./shared";
import { Canvas } from "./canvas";
import { Branches } from "./branches";
import { Blocks } from "./blocks";
import { Sheet } from "./drafting";
import { NodeChat } from "./node-chat";
import { Agents } from "./agents";
import { Connect, type ConnectLogo } from "./connect";

export type { ConnectLogo };

export type IllustrationId = "canvas" | "branches" | "blocks" | "nodeChat" | "agents" | "connect";

interface IIllustrationProps {
  /** Only the Connect scene reads it: the integration whose logo it shows. */
  logo?: ConnectLogo;
}

const ILLUSTRATIONS: Record<IllustrationId, (props: IIllustrationProps) => React.JSX.Element> = {
  canvas: Canvas,
  branches: Branches,
  blocks: Blocks,
  nodeChat: NodeChat,
  agents: Agents,
  connect: Connect,
};

/**
 * The slot's colours. --illo-plate is the promo background: solids filled
 * with it hide what's behind them.
 */
const COLORS =
  "bg-[#106CFB] [--illo-plate:#106CFB] [--illo-line:#4C91FC] [--illo-muted:#93BDFD] [--illo-ink:#FFFFFF]";

interface IProps extends IIllustrationProps {
  id: IllustrationId;
}

/**
 * The promo slot. Scenes crossfade through a blur, and each one replays its
 * entrance on mount: keying by `id` is what remounts it on every hover. The
 * logo isn't in the key, so moving between integrations keeps the scene.
 */
export function MenuIllustration(props: IProps) {
  const { id, logo } = props;

  const Illustration = ILLUSTRATIONS[id];

  return (
    // TODO: back to "user" before shipping. Off while iterating on motion.
    <MotionConfig reducedMotion="never">
      <div className={`relative size-full overflow-hidden rounded-lg ${COLORS}`}>
        <svg viewBox={VIEW_BOX} aria-hidden="true" className="absolute inset-0 size-full">
          <Sheet />
        </svg>
        <AnimatePresence>
          <motion.div
            key={id}
            className="absolute inset-0"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <svg viewBox={VIEW_BOX} aria-hidden="true" className="size-full">
              <Illustration logo={logo} />
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
