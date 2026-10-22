import { useEffect, useLayoutEffect, useRef } from "react";
import { comboThresholds } from "./combo";
import { usePreferences } from "./preferences";
import { useReducedMotion } from "./useReducedMotion";
import { createComboSparks } from "./comboSparks";

// One owner writes the fill. Completing a stage and resetting it are ordered
// phases, never competing CSS/Web Animations on the same width.
export function useComboMotion(
  streak: number,
  fraction: number,
  earned: number,
  stage: number,
  epoch: number,
) {
  const fill = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const sparks = useRef<ReturnType<typeof createComboSparks> | null>(null);
  const animations = useRef<Animation[]>([]);
  const { preferences } = usePreferences();
  const reduced = useReducedMotion();
  const allowed =
    !reduced &&
    preferences.effectIntensity > 0 &&
    preferences.graphicsTier !== "low";
  const state = useRef({
    tier: 0,
    earned: 0,
    displayed: 0,
    target: 0,
    from: 0,
    to: 0,
    start: 0,
    duration: 100,
    phase: "track",
    frame: null as number | null,
    freshUntil: 0,
    lastSpark: -Infinity,
    lastBurst: -Infinity,
    configuration: "",
    rollTier: 0,
    epoch,
  });

  useLayoutEffect(() => {
    if (!layer.current) return;
    const renderer = createComboSparks(layer.current);
    sparks.current = renderer;
    const clear = () => {
      renderer.clear();
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      const motion = state.current;
      if (motion.frame !== null) cancelAnimationFrame(motion.frame);
      motion.frame = null;
      motion.phase = "track";
      motion.freshUntil = 0;
      motion.displayed = motion.target;
      if (fill.current) fill.current.style.width = `${motion.target}%`;
      if (meter.current) meter.current.dataset.phase = "track";
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("resize", clear);
    window.visualViewport?.addEventListener("resize", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clear();
      sparks.current = null;
      window.removeEventListener("resize", clear);
      window.visualViewport?.removeEventListener("resize", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [
    allowed,
    preferences.graphicsTier,
    preferences.effectIntensity,
    preferences.screenShake,
  ]);

  useLayoutEffect(() => {
    const motion = state.current;
    if (motion.epoch !== epoch) {
      if (motion.frame !== null) cancelAnimationFrame(motion.frame);
      sparks.current?.clear();
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      Object.assign(motion, {
        epoch,
        tier: 0,
        earned: 0,
        displayed: 0,
        target: 0,
        phase: "track",
        frame: null,
        lastBurst: -Infinity,
      });
    }
    const goal = comboThresholds[stage] ?? comboThresholds[4];
    const target = Math.max(
      0,
      Math.min(100, ((streak - fraction) / goal) * 100),
    );
    const oldTier = motion.tier;
    const fresh = earned > motion.earned;
    motion.earned = earned;
    motion.tier = stage;
    const now = performance.now();
    if (fresh) motion.freshUntil = now + 220;
    // Brief typing momentum prevents a 100ms decay sample from tugging the
    // fill backward between correct keys. Actual XP/charge remain exact.
    motion.target =
      allowed && !fresh && now < motion.freshUntil
        ? Math.max(motion.target, target)
        : target;
    const configuration = `${allowed}:${preferences.graphicsTier}:${preferences.effectIntensity}:${preferences.screenShake}`;
    const changed =
      motion.configuration !== "" && motion.configuration !== configuration;
    motion.configuration = configuration;
    const paint = (percent: number) => {
      motion.displayed = percent;
      if (fill.current) fill.current.style.width = `${percent}%`;
      if (meter.current) meter.current.dataset.phase = motion.phase;
    };
    const cancelFrame = () => {
      if (motion.frame !== null) cancelAnimationFrame(motion.frame);
      motion.frame = null;
    };
    if (!allowed || document.hidden || streak <= 0 || changed) {
      cancelFrame();
      motion.phase = "track";
      paint(motion.target);
      return;
    }
    if (motion.phase !== "track") {
      if (fresh && stage > oldTier)
        motion.rollTier = Math.max(motion.rollTier, stage);
      return;
    }
    cancelFrame();
    if (fresh && stage > oldTier) {
      motion.phase = "complete";
      motion.rollTier = stage;
      motion.to = 100;
    } else {
      motion.phase = "track";
      motion.to = motion.target;
    }
    if (motion.phase === "track" && motion.displayed === motion.to) {
      paint(motion.to);
      return;
    }
    motion.from = motion.displayed;
    motion.start = now;
    motion.duration = motion.phase === "complete" ? 64 : 100;
    paint(motion.displayed);
    const burst = () => {
      const surface = meter.current;
      const bar = fill.current;
      if (
        !surface ||
        !bar ||
        document.hidden ||
        performance.now() - motion.lastBurst < 240
      )
        return;
      motion.lastBurst = performance.now();
      const bounds = bar.getBoundingClientRect();
      sparks.current?.emit(
        bounds.right,
        bounds.top + bounds.height / 2,
        motion.rollTier,
        preferences.graphicsTier,
        preferences.effectIntensity,
        true,
      );
      animations.current.forEach((animation) => animation.cancel());
      const power =
        preferences.effectIntensity === 1 ? 1 : 2 + motion.rollTier * 0.45;
      animations.current = [
        surface.animate(
          [
            { boxShadow: "0 0 0px #ffb45e00" },
            {
              boxShadow: `0 0 ${18 + motion.rollTier * 6}px #ffb45ecc`,
              offset: 0.18,
            },
            { boxShadow: "0 0 0px #ffb45e00" },
          ],
          { duration: 600, easing: "ease-out" },
        ),
      ];
      if (preferences.screenShake)
        animations.current.push(
          surface.animate(
            [
              { transform: "translate(0, 0)" },
              { transform: `translate(${-power}px, ${power / 2}px)` },
              { transform: `translate(${power}px, ${-power / 2}px)` },
              { transform: `translate(${-power / 2}px, 0)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: 200, easing: "ease-out" },
          ),
        );
    };
    const tick = (timestamp: number) => {
      if (document.hidden) {
        motion.phase = "track";
        paint(motion.target);
        motion.frame = null;
        return;
      }
      const previous = motion.displayed;
      const progress = Math.min(
        1,
        Math.max(0, timestamp - motion.start) / motion.duration,
      );
      paint(motion.from + (motion.to - motion.from) * progress);
      if (
        motion.displayed > previous &&
        timestamp <= motion.freshUntil &&
        timestamp - motion.lastSpark >= 30 &&
        fill.current
      ) {
        motion.lastSpark = timestamp;
        const bounds = fill.current.getBoundingClientRect();
        sparks.current?.emit(
          bounds.right,
          bounds.top + bounds.height / 2,
          motion.tier,
          preferences.graphicsTier,
          preferences.effectIntensity,
          false,
        );
      }
      if (progress >= 1) {
        if (motion.phase === "complete") {
          burst();
          motion.phase = "hold";
          motion.from = motion.to = 100;
          motion.start = timestamp;
          motion.duration = 64;
          paint(100);
        } else if (motion.phase === "hold") {
          motion.phase = "track";
          paint(motion.tier === comboThresholds.length ? 100 : 0);
          motion.from = motion.displayed;
          motion.to = motion.target;
          motion.start = timestamp;
          motion.duration = 100;
        } else {
          motion.frame = null;
          return;
        }
      }
      motion.frame = requestAnimationFrame(tick);
    };
    motion.frame = requestAnimationFrame(tick);
  }, [
    streak,
    fraction,
    earned,
    stage,
    epoch,
    allowed,
    preferences.graphicsTier,
    preferences.effectIntensity,
    preferences.screenShake,
  ]);

  useEffect(() => {
    const motion = state.current;
    return () => {
      if (motion.frame !== null) cancelAnimationFrame(motion.frame);
      motion.frame = null;
      motion.phase = "track";
      motion.tier = 0;
      motion.earned = 0;
      motion.displayed = 0;
    };
  }, []);
  return { fill, meter, layer, allowed };
}
