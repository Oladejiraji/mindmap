const APP_KEY = "mindmap";

function prefixed(key: string) {
  return `${APP_KEY}:${key}`;
}

export function getStorageItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(prefixed(key));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(prefixed(key), JSON.stringify(value));
  } catch {}
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(prefixed(key));
  } catch {}
}
