import { useCallback, useSyncExternalStore } from "react";
import { useStoredBoolean } from "@/lib/use-stored-boolean";

/*
 * User preferences. All client-side (localStorage); there's no settings
 * backend yet. Shared by the account menu's Preferences submenu and the
 * Settings page.
 */

/** Show the canvas shortcut hint pill (same key the canvas reads). */
export function useCanvasHints() {
  return useStoredBoolean("mindmap:canvas-hints", true);
}

/** Fade streamed replies in word by word (off: words just appear). */
export function useAnimatedReplies() {
  return useStoredBoolean("mindmap:animated-replies", true);
}

export type HomeLayout = "grid" | "list";
const HOME_LAYOUT_KEY = "mindmap:home-layout";
const EVENT = "mindmap:home-layout";

function readLayout(): HomeLayout {
  try {
    return JSON.parse(window.localStorage.getItem(HOME_LAYOUT_KEY) ?? '"grid"') === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === HOME_LAYOUT_KEY && onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

/** How Home lists projects (same key the Home page's toggle writes). */
export function useHomeLayout() {
  const layout = useSyncExternalStore(subscribe, readLayout, () => "grid" as HomeLayout);
  const setLayout = useCallback((next: HomeLayout) => {
    try {
      window.localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [layout, setLayout] as const;
}
