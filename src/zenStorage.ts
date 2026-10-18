import { createZen } from "./zenEngine";
import type { ZenState } from "./zenEngine";
import { loadZenProgress, saveZenProgress } from "./progressStore";

export function loadZen() {
  const progress = loadZenProgress();
  return {
    state: progress.state ?? createZen(),
    storageAvailable: progress.storageAvailable,
  };
}
export function saveZen(state: ZenState, now: number) {
  return saveZenProgress(state, now);
}
