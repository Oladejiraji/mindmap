"use client";
import React, { useRef, useState } from "react";
import { motion, useAnimationFrame } from "motion/react";

const SCALE = 0.75;
const CARD_WIDTH = 570 * SCALE;
const CARD_HEIGHT = 861 * SCALE;
const CIRCLE_SIZE = 479 * SCALE;
const MAIN_FONT_SIZE = 45 * SCALE;
const TEXT_COUNT = 35;
const MIN_OPACITY = 0.025;
const HEADER_PADDING_X = 48 * SCALE;
const HEADER_PADDING_TOP = 33 * SCALE;
const HEADER_PADDING_BOTTOM = 40 * SCALE;
const HEADING_FONT_SIZE = 50 * SCALE;
const CARD_GAP = 24 * SCALE;
const CONTENT_GAP = 42 * SCALE;
const SUB_TEXT_FONT_SIZE = 14 * SCALE;
const FOOTER_GAP = 50 * SCALE;
const STEP_ANGLE = 360 / TEXT_COUNT;
const FOLLOW_SMOOTHING_MS = 120;
const LABELS = Array.from({ length: TEXT_COUNT }, (_, i) => i);

const mod = (n: number, m: number) => ((n % m) + m) % m;

// Shortest signed distance between two positions on the ring, in label steps.
const ringDiff = (from: number, to: number) =>
  mod(to - from + TEXT_COUNT / 2, TEXT_COUNT) - TEXT_COUNT / 2;

// Labels go counter-clockwise from the blue one at 0°.
const angleOf = (i: number) => -STEP_ANGLE * i;

const opacityForRank = (rank: number) =>
  Math.max(0, 1 - ((1 - MIN_OPACITY) / (TEXT_COUNT - 1)) * rank);

// Deterministic pseudo-random in [0, 1) so server and client render the same.
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Snap-in intro + the blue head follows the cursor.
export default function Page() {
  const ringRef = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [head, setHead] = useState(0);

  useAnimationFrame((_, delta) => {
    setHead((current) => {
      const diff = ringDiff(current, target.current);
      if (Math.abs(diff) < 0.001) return current;
      return current + diff * Math.min(1, delta / FOLLOW_SMOOTHING_MS);
    });
  });

  return (
    <div
      className="h-screen w-full flex items-center justify-center bg-black"
      onPointerMove={(e) => {
        if (!ringRef.current) return;
        const rect = ringRef.current.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        target.current = -angle / STEP_ANGLE;
      }}
      onPointerLeave={() => {
        target.current = 0;
      }}
    >
      <div
        className="bg-[#DFFBFF] flex flex-col"
        style={{
          gap: CARD_GAP,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          paddingTop: HEADER_PADDING_TOP,
          paddingBottom: HEADER_PADDING_BOTTOM,
        }}
      >
        <div
          className="flex justify-between"
          style={{
            padding: `0 ${HEADER_PADDING_X}px`,
          }}
        >
          <h1
            className="font-google-sans tracking-[-3%] leading-none"
            style={{
              fontSize: HEADING_FONT_SIZE,
            }}
          >
            One <br /> Perfect <br /> Route
          </h1>

          <p
            className="text-right font-diatype tracking-[-3%] leading-none mt-2"
            style={{
              fontSize: SUB_TEXT_FONT_SIZE,
            }}
          >
            Fragmented learning leaves <br /> you running in circles.
          </p>
        </div>
        <div
          className="flex flex-col flex-1"
          style={{
            gap: CONTENT_GAP,
          }}
        >
          <div className="flex justify-center flex-1 items-center">
            <div
              ref={ringRef}
              className="relative flex items-center justify-center"
              style={{
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
              }}
            >
              {LABELS.map((i) => {
                const rank = mod(i - head, TEXT_COUNT);
                const isHead = rank < 1;
                const settleDelay = 0.3 + hash(i + 100) * 0.4;
                return (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2 flex justify-end origin-left"
                    style={{
                      width: CIRCLE_SIZE / 2,
                      zIndex: isHead ? TEXT_COUNT : 0,
                      opacity: isHead ? 1 : 0.7,
                      y: "-50%",
                    }}
                    initial={{ rotate: angleOf(i) + (hash(i) * 2 - 1) * 180 }}
                    animate={{ rotate: angleOf(i) }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 18,
                      delay: settleDelay,
                    }}
                  >
                    <motion.p
                      className="font-google-sans tracking-[-3%] leading-none whitespace-nowrap font-medium"
                      style={{
                        fontSize: MAIN_FONT_SIZE,
                      }}
                      initial={{ opacity: 0, filter: "blur(10px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.7,
                        ease: "easeOut",
                        delay: settleDelay,
                      }}
                    >
                      <span
                        style={{
                          color: isHead ? "#0052FF" : "#000000",
                          opacity: opacityForRank(rank),
                        }}
                      >
                        MindMap
                      </span>
                    </motion.p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{
              gap: FOOTER_GAP,
              padding: `0 ${HEADER_PADDING_X}px`,
            }}
          >
            <p
              className="font-diatype tracking-[-3%] leading-none"
              style={{
                fontSize: SUB_TEXT_FONT_SIZE,
              }}
            >
              Bridge complex ideas with seamless execution.
            </p>
            <p className="text-black font-bricolage leading-5 tracking-[-2.6%] font-semibold text-13">
              mindmap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
