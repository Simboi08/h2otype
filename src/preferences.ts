import { useSyncExternalStore } from "react";

export const preferencesKey = "h2otype.preferences.v1";
export const wpmRefreshOptions = [
  { value: 0, label: "Instant" },
  { value: 500, label: "0.5 seconds" },
  { value: 1000, label: "1 second" },
  { value: 2000, label: "2 seconds" },
] as const;
type WpmRefreshMs = (typeof wpmRefreshOptions)[number]["value"];
export const defaultPreferences = {
  liveWpm: false,
  liveAccuracy: false,
  xpProgress: true,
  levelNotifications: true,
  wpmRefreshMs: 500 as WpmRefreshMs,
};
export type Preferences = typeof defaultPreferences;
export type BooleanPreferenceKey = Exclude<keyof Preferences, "wpmRefreshMs">;

export function isWpmRefreshMs(value: unknown): value is WpmRefreshMs {
  return wpmRefreshOptions.some((option) => option.value === value);
}
type Snapshot = { preferences: Preferences; storageAvailable: boolean };
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

export function parsePreferences(raw: string | null): Preferences {
  const preferences = { ...defaultPreferences };
  try {
    const data = JSON.parse(raw ?? "null") as {
      version?: unknown;
      preferences?: Record<string, unknown>;
    } | null;
    if (
      data?.version !== 1 ||
      !data.preferences ||
      typeof data.preferences !== "object"
    )
      return preferences;
    for (const key of [
      "liveWpm",
      "liveAccuracy",
      "xpProgress",
      "levelNotifications",
    ] as const) {
      const value = data.preferences[key];
      if (typeof value === "boolean") preferences[key] = value;
    }
    if (isWpmRefreshMs(data.preferences.wpmRefreshMs))
      preferences.wpmRefreshMs = data.preferences.wpmRefreshMs;
  } catch {
    /* Invalid or older data falls back to the documented defaults. */
  }
  return preferences;
}

function getSnapshot(): Snapshot {
  if (!snapshot) {
    try {
      snapshot = {
        preferences: parsePreferences(localStorage.getItem(preferencesKey)),
        storageAvailable: true,
      };
    } catch {
      snapshot = {
        preferences: { ...defaultPreferences },
        storageAvailable: false,
      };
    }
  }
  return snapshot;
}
export function getPreferences() {
  return getSnapshot().preferences;
}
function emit() {
  for (const listener of listeners) listener();
}

export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
) {
  const preferences = { ...getSnapshot().preferences, [key]: value };
  let storageAvailable = true;
  try {
    localStorage.setItem(
      preferencesKey,
      JSON.stringify({ version: 1, preferences }),
    );
  } catch {
    storageAvailable = false;
  }
  snapshot = { preferences, storageAvailable };
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key !== preferencesKey && event.key !== null) return;
  snapshot = {
    preferences: parsePreferences(event.newValue),
    storageAvailable: true,
  };
  emit();
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}
export function usePreferences() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
