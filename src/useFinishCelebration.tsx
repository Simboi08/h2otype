import { useEffect, useRef } from "react";
import { usePreferences } from "./preferences";
import { useReducedMotion } from "./useReducedMotion";
import { playScreenBurst } from "./screenBursts";

export function useFinishCelebration(completed: boolean) {
  const { preferences } = usePreferences();
  const reduced = useReducedMotion();
  const layer = useRef<HTMLDivElement>(null);
  const previous = useRef(completed);
  const allowed =
    !reduced &&
    preferences.graphicsTier !== "low" &&
    preferences.effectIntensity > 0 &&
    preferences.confettiAmount > 0;
  useEffect(() => {
    const fresh = completed && !previous.current;
    previous.current = completed;
    if (!fresh || !allowed || document.hidden || !layer.current) return;
    const clear = playScreenBurst(
      layer.current,
      "finish",
      preferences.graphicsTier,
      preferences.effectIntensity,
      1,
      preferences.confettiAmount,
    );
    const hidden = () => {
      if (document.hidden) clear();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize", clear);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", clear);
    };
  }, [
    completed,
    allowed,
    preferences.graphicsTier,
    preferences.effectIntensity,
    preferences.confettiAmount,
  ]);
  return (
    <div
      className="screen-burst finish-confetti"
      aria-hidden="true"
      ref={layer}
    />
  );
}
