import { useEffect, useSyncExternalStore } from "react";

/*
 * Open tabs (projects and new-project), persisted in localStorage and shared
 * across the tab strip and pages via useSyncExternalStore. Purely client
 * state — nothing is stored on the backend.
 */
export type OpenTab = {
  href: string;
  kind: "project" | "node" | "new";
  title: string;
};

const KEY = "mindmap:tabs";
const EVENT = "mindmap:tabs";
const MAX_TABS = 12;
const EMPTY: OpenTab[] = [];

let cache: { raw: string | null; tabs: OpenTab[] } = { raw: null, tabs: EMPTY };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): OpenTab[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.tabs;
  let tabs: OpenTab[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    // Nodes open in a side panel now; drop node tabs saved before that.
    if (Array.isArray(parsed)) tabs = parsed.filter((t: OpenTab) => t.kind !== "node" && !t.href.includes("/n/"));
  } catch {
    tabs = EMPTY;
  }
  cache = { raw, tabs };
  return tabs;
}

function write(tabs: OpenTab[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(tabs));
  } catch {
    /* storage blocked — tabs just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useTabs(): OpenTab[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function openTab(tab: OpenTab) {
  const tabs = snapshot();
  const i = tabs.findIndex((t) => t.href === tab.href);
  if (i >= 0) {
    if (tabs[i].title === tab.title && tabs[i].kind === tab.kind) return;
    write(tabs.map((t, j) => (j === i ? tab : t)));
  } else {
    write([...tabs, tab].slice(-MAX_TABS));
  }
}

/* Removes a tab and returns the href to show next if it was the active one. */
export function closeTab(href: string, activeHref: string): string | null {
  const tabs = snapshot();
  const i = tabs.findIndex((t) => t.href === href);
  if (i < 0) return null;
  const rest = tabs.filter((t) => t.href !== href);
  write(rest);
  if (href !== activeHref) return null;
  return (rest[i] ?? rest[i - 1])?.href ?? "/";
}

/* Opens (or refreshes the title of) the tab for the current page. Syncing
 * with localStorage is a legitimate external-system effect. */
export function useRegisterTab(tab: OpenTab | null) {
  const href = tab?.href;
  const kind = tab?.kind;
  const title = tab?.title;
  useEffect(() => {
    if (href && kind && title) openTab({ href, kind, title });
  }, [href, kind, title]);
}
