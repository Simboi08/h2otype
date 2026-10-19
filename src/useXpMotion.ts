import { useEffect, useLayoutEffect, useRef } from "react";
import { easeXp } from "./graphics";
import { getLevel } from "./progression";

// Only the fill is animated. Stored XP, labels, and accessible values remain exact.
export function useXpMotion(
  totalXp: number,
  duration: number,
  visible: boolean,
) {
  const fill = useRef<HTMLSpanElement>(null);
  const motion = useRef({
    initialized: false,
    displayed: totalXp,
    from: totalXp,
    target: totalXp,
    startedAt: 0,
    duration,
    frame: null as number | null,
  });
  useLayoutEffect(() => {
    const state = motion.current;
    const paint = (xp: number) => {
      state.displayed = xp;
      const level = getLevel(Math.floor(xp));
      if (fill.current) {
        fill.current.style.transform = `scaleX(${(level.current + xp - Math.floor(xp)) / level.required})`;
        fill.current.dataset.visualLevel = String(level.level);
      }
    };
    state.target = totalXp;
    state.duration = duration;
    if (
      !state.initialized ||
      !visible ||
      !duration ||
      document.hidden ||
      totalXp < state.displayed
    ) {
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      state.frame = null;
      state.initialized = true;
      paint(totalXp);
      return;
    }
    if (state.frame !== null || state.displayed === totalXp) {
      paint(state.displayed);
      return;
    }
    state.from = state.displayed;
    state.startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - state.startedAt) / state.duration);
      paint(state.from + (state.target - state.from) * easeXp(progress));
      state.frame = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    state.frame = requestAnimationFrame(tick);
  }, [totalXp, duration, visible]);

  useEffect(() => {
    const finish = () => {
      const state = motion.current;
      if (state.frame !== null) cancelAnimationFrame(state.frame);
      state.frame = null;
      state.displayed = state.target;
      const level = getLevel(state.target);
      if (fill.current) {
        fill.current.style.transform = `scaleX(${level.percent / 100})`;
        fill.current.dataset.visualLevel = String(level.level);
      }
    };
    const visibility = () => {
      if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      finish();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return fill;
}
