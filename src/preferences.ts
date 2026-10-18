import { useSyncExternalStore } from "react";

export const preferencesKey = "h2otype.preferences.v1";
export const defaultPreferences = {
  liveWpm: false,
  liveAccuracy: false,
  xpProgress: true,
  levelNotifications: true,
};
export type Preferences = typeof defaultPreferences;
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
    for (const key of Object.keys(preferences) as (keyof Preferences)[]) {
      const value = data.preferences[key];
      if (typeof value === "boolean") preferences[key] = value;
    }
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

export function setPreference(key: keyof Preferences, value: boolean) {
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
