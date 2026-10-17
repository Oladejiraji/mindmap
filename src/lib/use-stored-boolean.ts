import { useCallback, useSyncExternalStore } from "react";

// A boolean persisted in localStorage and shared across components in the
// tab. Server render and storage failures fall back to `fallback`.
const EVENT = "stored-boolean";

function read(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export function useStoredBoolean(key: string, fallback: boolean) {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (e: Event) => {
      if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) onChange();
    };
    window.addEventListener("storage", handler);
    window.addEventListener(EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EVENT, handler);
    };
  }, [key]);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(read(key, fallback)) : next;
      try {
        window.localStorage.setItem(key, resolved ? "1" : "0");
      } catch {
        /* storage blocked — the toggle just won't persist */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key, fallback],
  );

  return [value, setValue] as const;
}
