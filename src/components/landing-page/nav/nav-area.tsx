"use client";
import React, { useRef, useState } from "react";
import { MenuContent } from "./menu-content";

export type NavState = "features" | "solutions" | null;

const navButtonOptions: { id: number; label: string; menu: NavState }[] = [
  { id: 1, label: "Features", menu: "features" },
  { id: 2, label: "Solutions", menu: "solutions" },
  { id: 3, label: "Developers", menu: null },
];

interface INavButton {
  label: string;
  /** The menu this button opens, or null if it has none. */
  menuState: NavState;
  activeState: NavState;
  onOpen: () => void;
  onToggle: () => void;
}

/**
 * Hover-to-open on a mouse, tap-to-toggle on touch and pen.
 *
 * It all hangs off `pointerType`, which pointer events carry and mouse events
 * don't: browsers synthesise `mouseenter` after a tap, so `onMouseEnter` can't
 * tell a finger from a cursor. Hover is therefore gated to mouse, and touch/pen
 * fall through to `onClick`, which toggles. `onFocus` needs the
 * `:focus-visible` gate because a tap fires focus *before* click — ungated, it
 * opens the menu and the toggle then reads its own write and closes it again.
 */
function NavButton(props: INavButton) {
  const { label, menuState, activeState, onOpen, onToggle } = props;

  const hasMenu = menuState !== null;
  const isActive = hasMenu && menuState === activeState;

  const pointerType = useRef("mouse");

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        pointerType.current = e.pointerType;
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onOpen();
      }}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) onOpen();
      }}
      onClick={() => {
        if (pointerType.current !== "mouse") onToggle();
      }}
      aria-expanded={hasMenu ? isActive : undefined}
      className={`h-7 px-2 font-inter-display text-13 leading-5 tracking-[-2.6%] text-shadow-[0_1px_1px_0_rgb(0_0_0/0.12)] cursor-pointer rounded-[6px] transition-colors duration-150 ${
        isActive
          ? "bg-white/12 text-white"
          : "text-[#BAE1FB] hover:bg-white/12 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export function NavArea() {
  const [navState, setNavState] = useState<NavState>(null);

  return (
    <div
      className="flex gap-1 items-center relative"
      // Mouse only: one tap fires enter -> down -> up -> leave in a single
      // gesture, so an ungated leave would close what the tap just opened.
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        setNavState(null);
      }}
    >
      {navButtonOptions.map((item) => (
        <NavButton
          key={item.id}
          label={item.label}
          menuState={item.menu}
          activeState={navState}
          onOpen={() => setNavState(item.menu)}
          onToggle={() =>
            setNavState((current) => (current === item.menu ? null : item.menu))
          }
        />
      ))}

      <div
        className={`absolute z-20 left-[50%] -translate-x-1/2 top-full justify-center items-center pt-6 ${
          navState ? "flex" : "hidden"
        }`}
      >
        {navState && <MenuContent state={navState} />}
      </div>
    </div>
  );
}
