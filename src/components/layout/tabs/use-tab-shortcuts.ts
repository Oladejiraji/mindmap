"use client";

import { useEffect, useRef } from "react";

/*
 * Tab shortcuts, all on ⌥ (Option/Alt): the browser keeps ⌘T, ⌘W,
 * Ctrl+Tab and ⌘1–9 for its own tabs. Keys are read by position
 * (e.code), since ⌥ + a key types a symbol on a Mac (⌥1 is ¡).
 * Nothing fires while typing in a field. Listed in src/lib/shortcuts.ts.
 */

export type TabShortcutActions = {
  /** Go to the tab at this index; -1 for the last tab. */
  goTo: (index: number) => void;
  /** Previous (-1) or next (+1) tab, wrapping around. */
  step: (direction: -1 | 1) => void;
  newProject: () => void;
  closeCurrent: () => void;
  reopenClosed: () => void;
  openSearch: () => void;
};

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA");
};

export function useTabShortcuts(actions: TabShortcutActions) {
  // The listener is added once; it calls the latest actions through a ref.
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented || isTyping()) return;
      const a = latest.current;
      const digit = /^Digit([1-9])$/.exec(e.code)?.[1];
      let handled = true;
      if (digit) a.goTo(digit === "9" ? -1 : Number(digit) - 1);
      else if (e.code === "BracketLeft") a.step(-1);
      else if (e.code === "BracketRight") a.step(1);
      else if (e.code === "KeyT" && e.shiftKey) a.reopenClosed();
      else if (e.code === "KeyT") a.newProject();
      else if (e.code === "KeyW") a.closeCurrent();
      else if (e.code === "KeyK") a.openSearch();
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
