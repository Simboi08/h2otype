import { createZen, parseZen, pauseZen } from "./zenEngine";
import type { ZenState } from "./zenEngine";
const key = "h2otype.zen-session.v1";

export function loadZen() {
  try {
    return {
      state: parseZen(localStorage.getItem(key)) ?? createZen(),
      storageAvailable: true,
    };
  } catch {
    return { state: createZen(), storageAvailable: false };
  }
}

export function saveZen(state: ZenState, now: number) {
  try {
    if (state.session.attempts === 0) localStorage.removeItem(key);
    else
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, state: pauseZen(state, now) }),
      );
    return true;
  } catch {
    return false;
  }
}
