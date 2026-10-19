import { useCallback, useSyncExternalStore } from "react";

/*
 * Teams inside the workspace (e.g. Product, Research). Kept in this
 * browser until the backend has organizations; see
 * doc/onboarding-orgs-spec.md ("Teams"). Each team gets a stable colour
 * from a small palette so its tile is recognisable.
 */
export type Team = { id: string; name: string; color: string; createdAt: number };

export const TEAM_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#64748B"];

const KEY = "mindmap:teams";
const EVENT = "mindmap:teams";
const EMPTY: Team[] = [];
let cache: { raw: string | null; value: Team[] } = { raw: null, value: EMPTY };

function snapshot(): Team[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed;
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

function write(teams: Team[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(teams));
  } catch {
    /* storage blocked */
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

export function useTeams() {
  const teams = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const create = useCallback((name: string) => {
    const current = snapshot();
    const team: Team = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: TEAM_COLORS[current.length % TEAM_COLORS.length],
      createdAt: Date.now(),
    };
    write([...current, team]);
  }, []);
  const rename = useCallback((id: string, name: string) => {
    write(snapshot().map((t) => (t.id === id ? { ...t, name: name.trim() } : t)));
  }, []);
  const remove = useCallback((id: string) => {
    write(snapshot().filter((t) => t.id !== id));
  }, []);
  return { teams, create, rename, remove };
}
