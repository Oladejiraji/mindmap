import { useCallback, useSyncExternalStore } from "react";

/*
 * Onboarding answers (B2B): organization, team size, role, use cases.
 * Kept in this browser until the backend has organizations and profile
 * fields (see doc/onboarding-orgs-spec.md); the shape matches that spec
 * so it can move to Convex as-is.
 */
export type TeamSize = "1-10" | "11-50" | "51-200" | "200+";
export type Role = "product" | "design" | "engineering" | "research" | "leadership" | "other";
export type UseCase = "research" | "strategy" | "product-discovery" | "learning" | "planning" | "other";

export type Onboarding = {
  orgName: string;
  teamSize: TeamSize | null;
  role: Role | null;
  useCases: UseCase[];
  completedAt: number | null;
};

export const TEAM_SIZES: { value: TeamSize; label: string }[] = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "200+", label: "200+" },
];

export const ROLES: { value: Role; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
  { value: "engineering", label: "Engineering" },
  { value: "research", label: "Research" },
  { value: "leadership", label: "Founder / Leadership" },
  { value: "other", label: "Other" },
];

export const USE_CASES: { value: UseCase; label: string; hint: string }[] = [
  { value: "research", label: "Research", hint: "Dig into a topic and keep every thread" },
  { value: "strategy", label: "Strategy", hint: "Weigh options and trace decisions" },
  { value: "product-discovery", label: "Product discovery", hint: "Explore problems before building" },
  { value: "planning", label: "Planning", hint: "Break work into branches" },
  { value: "learning", label: "Learning", hint: "Study something new, step by step" },
  { value: "other", label: "Something else", hint: "We'll figure it out together" },
];

const KEY = "mindmap:onboarding";
const EVENT = "mindmap:onboarding";
const EMPTY: Onboarding = { orgName: "", teamSize: null, role: null, useCases: [], completedAt: null };

let cache: { raw: string | null; value: Onboarding } = { raw: null, value: EMPTY };

function snapshot(): Onboarding {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    if (raw) value = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
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

export function useOnboarding() {
  const value = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const update = useCallback((patch: Partial<Onboarding>) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...snapshot(), ...patch }));
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [value, update] as const;
}

export function labelOf<T extends string>(options: { value: T; label: string }[], value: T | null) {
  return options.find((o) => o.value === value)?.label ?? null;
}
