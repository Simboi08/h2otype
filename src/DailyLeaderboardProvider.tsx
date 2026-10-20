import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DailyPublishing } from "./dailyPublishing";
import { DailyPublishingContext } from "./dailyPublishingContext";
import DailyRankings from "./DailyRankings";

export default function DailyLeaderboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [store] = useState(() => new DailyPublishing());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const rollover = () => {
      store.rollover();
      clearTimeout(timer.current);
      const midnight =
        Date.parse(`${store.snapshot().today}T00:00:00Z`) + 86400000;
      timer.current = setTimeout(rollover, midnight - Date.now() + 25);
    };
    const visible = () => {
      if (!document.hidden) {
        rollover();
        void store.refresh();
      }
    };
    rollover();
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [store]);
  return (
    <DailyPublishingContext.Provider value={store}>
      {children}
      <DailyRankings />
    </DailyPublishingContext.Provider>
  );
}
