import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePreferences } from "./preferences";
import type { ParticleStyle } from "./preferences";
import { advanceClock } from "./typingEngine";
import type { Session } from "./typingEngine";
import { getTypingFeedback } from "./typingFeedback";
import { playTypingSound, stopTypingSounds } from "./typingSound";
import TypingParticles from "./TypingParticles";
import type { ParticleHandle } from "./TypingParticles";
import { useReducedMotion } from "./useReducedMotion";
import { getCombo, comboImpact, impactProfile } from "./combo";
import { playScreenBurst } from "./screenBursts";
import ComboMeter from "./ComboMeter";
import ComboVignette from "./ComboVignette";

export function useTypingFeedback(enabled: boolean) {
  const { preferences } = usePreferences();
  const reducedMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const pending = useRef<{ index: number; style: ParticleStyle } | null>(null);
  const edge = useRef<HTMLDivElement>(null);
  const clearEdge = useRef<(() => void) | null>(null);
  const impact = useRef<Animation | null>(null);
  const lastImpactAt = useRef(-Infinity);
  const canShake =
    enabled &&
    preferences.screenShake &&
    preferences.effectIntensity > 0 &&
    preferences.graphicsTier !== "low" &&
    !reducedMotion;
  const active = enabled && preferences.comboFeedback;
  const [combo, setCombo] = useState({
    active,
    streak: 0,
    fraction: 0,
    earned: 0,
  });
  // Clear stopped/disabled decorations; active clock updates follow engine charge.
  if (combo.active !== active)
    setCombo({ active, streak: 0, fraction: 0, earned: 0 });
  const reset = useCallback(() => {
    setCombo((current) => ({
      ...current,
      streak: 0,
      fraction: 0,
      earned: 0,
    }));
    pending.current = null;
    clearEdge.current?.();
    particles.current?.clear();
    impact.current?.cancel();
    impact.current = null;
    lastImpactAt.current = -Infinity;
    stopTypingSounds();
  }, []);
  useEffect(
    () => () => {
      impact.current?.cancel();
      impact.current = null;
    },
    [canShake, preferences.effectIntensity],
  );

  useEffect(() => {
    const clear = () => clearEdge.current?.();
    window.addEventListener("resize", clear);
    return () => {
      clear();
      window.removeEventListener("resize", clear);
    };
  }, [
    active,
    preferences.effectIntensity,
    preferences.graphicsTier,
    reducedMotion,
  ]);

  const onClock = useCallback(
    (session: Session) => {
      if (!enabled) return;
      setCombo((current) => {
        const streak = active ? session.streak : 0;
        const fraction = active ? session.comboDecayFraction : 0;
        return current.active === active &&
          current.streak === streak &&
          current.fraction === fraction
          ? current
          : { active, streak, fraction, earned: current.earned };
      });
      if (!session.streak) clearEdge.current?.();
    },
    [enabled, active],
  );

  function onEdit(before: Session, after: Session, passage: string) {
    if (!enabled) return;
    const streak = active ? after.streak : 0;
    setCombo((current) => ({
      active,
      streak,
      fraction: after.comboDecayFraction,
      earned: current.earned + Math.max(0, after.baseXp - before.baseXp),
    }));
    if (!streak) clearEdge.current?.();
    const feedback = getTypingFeedback(before, after, passage);
    if (!feedback.accepted) return;
    const tier = active
      ? comboImpact(advanceClock(before, after.now, null).streak, after.streak)
      : 0;
    if (
      tier &&
      !reducedMotion &&
      preferences.graphicsTier !== "low" &&
      preferences.effectIntensity > 0 &&
      !document.hidden &&
      edge.current
    ) {
      clearEdge.current?.();
      clearEdge.current = playScreenBurst(
        edge.current,
        "combo",
        preferences.graphicsTier,
        preferences.effectIntensity,
        tier,
      );
    }
    const timestamp = performance.now();
    const profile = impactProfile(preferences.effectIntensity, tier);
    const surface =
      container.current?.querySelector<HTMLElement>(".practice-surface");
    if (
      canShake &&
      tier &&
      surface &&
      !document.hidden &&
      timestamp - lastImpactAt.current >= profile.cooldown
    ) {
      impact.current?.cancel();
      const strength = profile.strength;
      const animation = surface.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: `translate(${-strength}px, ${strength / 2}px)` },
          { transform: `translate(${strength}px, ${-strength / 2}px)` },
          { transform: `translate(${-strength / 2}px, 0)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: profile.duration, easing: "ease-out" },
      );
      impact.current = animation;
      lastImpactAt.current = timestamp;
      animation.onfinish = () => {
        if (impact.current === animation) impact.current = null;
      };
    }
    playTypingSound(
      preferences.soundStyle,
      preferences.soundVolume,
      getCombo(streak).pitch,
    );
    if (
      feedback.correctIndex !== null &&
      preferences.effectIntensity > 0 &&
      preferences.particleStyle !== "off" &&
      !reducedMotion
    )
      pending.current = {
        index: feedback.correctIndex,
        style: preferences.particleStyle,
      };
  }
  // Read the new letter position after React updates and scrolls the passage.
  useLayoutEffect(() => {
    const burst = pending.current;
    pending.current = null;
    if (
      !burst ||
      !enabled ||
      preferences.effectIntensity === 0 ||
      reducedMotion ||
      burst.style !== preferences.particleStyle
    )
      return;
    const letter =
      container.current?.querySelectorAll(".character")[burst.index];
    const window = container.current?.querySelector(".passage-window");
    if (!letter || !window) return;
    const bounds = letter.getBoundingClientRect();
    const viewport = window.getBoundingClientRect();
    // Font metrics and scrolling can leave a visible glyph fractionally clipped
    // (notably at non-integer device scales). Only reject fully hidden letters.
    if (bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) return;
    particles.current?.emit(
      bounds.right + 2,
      Math.max(
        viewport.top,
        Math.min(viewport.bottom, bounds.y + bounds.height / 2),
      ),
    );
  });
  useEffect(() => {
    if (
      !enabled ||
      preferences.soundStyle === "off" ||
      preferences.soundVolume === 0
    )
      stopTypingSounds();
    const hidden = () => {
      if (document.hidden) reset();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stopTypingSounds();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [enabled, preferences.soundStyle, preferences.soundVolume, reset]);

  return {
    container,
    onEdit,
    onClock,
    reset,
    vignetteLayer: (
      <>
        {active &&
        getCombo(combo.streak).tier > 0 &&
        preferences.effectIntensity > 0 ? (
          <ComboVignette tier={getCombo(combo.streak).tier} />
        ) : null}
        {active &&
        !reducedMotion &&
        preferences.graphicsTier !== "low" &&
        preferences.effectIntensity > 0 ? (
          <div
            className="screen-burst combo-edge-particles"
            aria-hidden="true"
            ref={edge}
          />
        ) : null}
      </>
    ),
    comboMeter:
      active && combo.streak > 0 ? (
        <ComboMeter
          streak={combo.streak}
          fraction={combo.fraction}
          earned={combo.earned}
        />
      ) : null,
    layer:
      enabled &&
      preferences.effectIntensity > 0 &&
      preferences.particleStyle !== "off" &&
      !reducedMotion ? (
        <TypingParticles
          key={`${preferences.particleStyle}-${preferences.graphicsTier}`}
          ref={particles}
          style={preferences.particleStyle}
          tier={preferences.graphicsTier}
        />
      ) : null,
  };
}
