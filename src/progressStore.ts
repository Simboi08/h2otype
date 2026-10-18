import { useSyncExternalStore } from "react";
import { getPreferences } from "./preferences";
import { MAX_XP, getLevel } from "./progression";
import { parseZen, pauseZen } from "./zenEngine";
import type { ZenState } from "./zenEngine";

export const progressKey = "h2otype.progress.v1";
type Progress = {
  totalXp: number;
  zen: ZenState | null;
  storageAvailable: boolean;
  notice: number | null;
};
let snapshot: Progress | null = null;
const listeners = new Set<() => void>();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

export function parseProgress(
  raw: string | null,
): Pick<Progress, "totalXp" | "zen"> | null {
  try {
    const data = JSON.parse(raw ?? "null") as {
      version?: number;
      totalXp?: number;
      zen?: ZenState | null;
    } | null;
    if (
      data?.version !== 1 ||
      !Number.isSafeInteger(data.totalXp) ||
      data.totalXp! < 0 ||
      data.totalXp! > MAX_XP
    )
      return null;
    const zen = data.zen
      ? parseZen(JSON.stringify({ version: 1, state: data.zen }))
      : null;
    return { totalXp: data.totalXp!, zen };
  } catch {
    return null;
  }
}

function getSnapshot(): Progress {
  if (snapshot) return snapshot;
  try {
    const raw = localStorage.getItem(progressKey);
    const parsed = parseProgress(raw);
    const legacyZen =
      raw === null
        ? parseZen(localStorage.getItem("h2otype.zen-session.v1"))
        : null;
    snapshot = {
      totalXp: parsed?.totalXp ?? 0,
      zen: parsed?.zen ?? legacyZen,
      storageAvailable: true,
      notice: null,
    };
  } catch {
    snapshot = { totalXp: 0, zen: null, storageAvailable: false, notice: null };
  }
  return snapshot;
}

function emit() {
  for (const listener of listeners) listener();
}

// XP and its Zen credit history are one atomic storage write. Failed writes keep both in memory.
export function commitProgress(xpAdded: number, zen?: ZenState | null) {
  const previous = getSnapshot();
  const delta = Number.isSafeInteger(xpAdded) && xpAdded > 0 ? xpAdded : 0;
  const totalXp = Math.min(MAX_XP, previous.totalXp + delta);
  const oldLevel = getLevel(previous.totalXp).level;
  const newLevel = getLevel(totalXp).level;
  const next = {
    ...previous,
    totalXp,
    zen: zen === undefined ? previous.zen : zen,
    notice: !getPreferences().levelNotifications
      ? null
      : newLevel > oldLevel
        ? newLevel
        : previous.notice,
  };
  try {
    localStorage.setItem(
      progressKey,
      JSON.stringify({ version: 1, totalXp, zen: next.zen }),
    );
    next.storageAvailable = true;
  } catch {
    next.storageAvailable = false;
  }
  snapshot = next;
  emit();
  if (newLevel > oldLevel && next.notice !== null) {
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      snapshot = { ...getSnapshot(), notice: null };
      emit();
    }, 4000);
  }
  return next.storageAvailable;
}

export function loadZenProgress() {
  const current = getSnapshot();
  return { state: current.zen, storageAvailable: current.storageAvailable };
}

export function saveZenProgress(state: ZenState, now: number) {
  const previous = getSnapshot().zen;
  const delta = Math.max(
    0,
    state.session.xpEarned - (previous?.session.xpEarned ?? 0),
  );
  return commitProgress(
    delta,
    state.session.attempts === 0 ? null : pauseZen(state, now),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useProgress() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function dismissLevelNotice() {
  if (getSnapshot().notice === null) return;
  clearTimeout(noticeTimer);
  snapshot = { ...getSnapshot(), notice: null };
  emit();
}
