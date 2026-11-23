"use client";

import { useEffect, type RefObject } from "react";

/**
 * "/" jumps to the message box inside `ref` (unless you're already typing
 * somewhere). Listening for keys on the window is an external system.
 */
export function useSlashToFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      const box = ref.current?.querySelector<HTMLElement>("textarea, [contenteditable='true']");
      // Not one behind another layer (inert), like Chat view under a full-screen chat.
      if (!box || box.closest("[inert]")) return;
      e.preventDefault();
      box.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}
