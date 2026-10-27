"use client";
import React, { Fragment, useState } from "react";
import { motion } from "motion/react";

const transition = {
  type: "spring",
  stiffness: 260,
  damping: 34,
  mass: 0.9,
} as const;

// 20% slower than the items, so the panel opens under them.
const panelTransition = {
  type: "spring",
  stiffness: 180,
  damping: 28,
  mass: 0.9,
} as const;

const MENU_ITEMS = Array(4).fill(null);

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <div
        className="fixed inset-0 bg-[rgba(255,255,255,0.1)]"
        onClick={() => setIsOpen((open) => !open)}
      >
        <p>HELLO</p>
      </div>

      <motion.div
        className="fixed top-0 right-0 max-w-75 w-full bg-[#D4ECFC] h-full"
        animate={{
          clipPath: isOpen
            ? "circle(100vh at calc(100% - 44px) 44px)"
            : "circle(20px at calc(100% - 44px) 44px)",
        }}
        transition={isOpen ? panelTransition : undefined}
      >
        <div className="flex flex-col gap-4 pt-25 px-4">
          {MENU_ITEMS.map((_, index) => (
            <motion.div
              key={index}
              className="w-full h-10 bg-white"
              animate={{
                y: isOpen ? 0 : 40,
                opacity: isOpen ? 1 : 0,
              }}
              transition={{
                ...transition,
                delay: isOpen ? index * 0.08 : 0.02,
              }}
            />
          ))}
        </div>
        <div className="w-10 h-10 bg-[#D4ECFC] absolute top-6 right-6 rounded-full"></div>
      </motion.div>
    </Fragment>
  );
}
