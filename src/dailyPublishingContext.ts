import { createContext, useContext, useSyncExternalStore } from "react";
import type { DailyPublishing } from "./dailyPublishing";
export const DailyPublishingContext = createContext<DailyPublishing | null>(
  null,
);
export function useDailyPublishing() {
  const store = useContext(DailyPublishingContext);
  if (!store) throw new Error("Daily publishing provider is missing");
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  return { store, state };
}
