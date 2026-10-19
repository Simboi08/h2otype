import { createZen } from "./zenEngine";
import type { ZenState } from "./zenEngine";
import { loadZenProgress, saveZenProgress } from "./progressStore";
import { freshSeed } from "./wordBank";
import type { WordSet } from "./wordBank";

export function loadZen(wordSet: WordSet = "sentences") {
  const progress = loadZenProgress();
  return {
    state: progress.state ?? createZen(wordSet, freshSeed()),
    storageAvailable: progress.storageAvailable,
  };
}
export function saveZen(state: ZenState, now: number) {
  return saveZenProgress(state, now);
}
