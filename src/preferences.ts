import { useSyncExternalStore } from "react";

export const preferencesKey = "h2otype.preferences.v1";
export const wpmRefreshOptions = [
  { value: 0, label: "Instant" },
  { value: 500, label: "0.5 seconds" },
  { value: 1000, label: "1 second" },
  { value: 2000, label: "2 seconds" },
] as const;
type WpmRefreshMs = (typeof wpmRefreshOptions)[number]["value"];
export const typingFonts = [
  {
    value: "mono",
    label: "Monospace",
    family: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  {
    value: "system",
    label: "System",
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    value: "serif",
    label: "Serif",
    family: 'Georgia, "Times New Roman", serif',
  },
] as const;
export type TypingFont = (typeof typingFonts)[number]["value"];
export type SoundStyle = "off" | "standard" | "bitcrush";
export type ParticleStyle = "off" | "regular" | "pixel";
export type Preferences = {
  liveWpm: boolean;
  liveAccuracy: boolean;
  xpProgress: boolean;
  levelNotifications: boolean;
  wpmRefreshMs: WpmRefreshMs;
  typingFont: TypingFont;
  typingWeight: number;
  typingScale: number;
  soundStyle: SoundStyle;
  soundVolume: number;
  particleStyle: ParticleStyle;
};
export const defaultPreferences: Preferences = {
  liveWpm: false,
  liveAccuracy: false,
  xpProgress: true,
  levelNotifications: true,
  wpmRefreshMs: 500,
  typingFont: "mono",
  typingWeight: 400,
  typingScale: 100,
  soundStyle: "off",
  soundVolume: 35,
  particleStyle: "off",
};
export type BooleanPreferenceKey =
  | "liveWpm"
  | "liveAccuracy"
  | "xpProgress"
  | "levelNotifications";

export function isTypingFont(value: unknown): value is TypingFont {
  return typingFonts.some((font) => font.value === value);
}
export function isSoundStyle(value: unknown): value is SoundStyle {
  return value === "off" || value === "standard" || value === "bitcrush";
}
export function isParticleStyle(value: unknown): value is ParticleStyle {
  return value === "off" || value === "regular" || value === "pixel";
}

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
    if (isTypingFont(data.preferences.typingFont))
      preferences.typingFont = data.preferences.typingFont;
    if (isSoundStyle(data.preferences.soundStyle))
      preferences.soundStyle = data.preferences.soundStyle;
    if (isParticleStyle(data.preferences.particleStyle))
      preferences.particleStyle = data.preferences.particleStyle;
    for (const [key, min, max, step] of [
      ["typingWeight", 400, 700, 100],
      ["typingScale", 80, 130, 10],
      ["soundVolume", 0, 100, 5],
    ] as const) {
      const value = data.preferences[key];
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= min &&
        value <= max &&
        (value - min) % step === 0
      )
        preferences[key] = value;
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
