import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePreferences } from "./preferences";
import type { ParticleStyle } from "./preferences";
import type { Session } from "./typingEngine";
import { getTypingFeedback } from "./typingFeedback";
import { playTypingSound, stopTypingSounds } from "./typingSound";
import TypingParticles from "./TypingParticles";
import type { ParticleHandle } from "./TypingParticles";
import { useReducedMotion } from "./useReducedMotion";
import { advanceCombo, getCombo, comboImpact, impactProfile } from "./combo";
import ComboMeter from "./ComboMeter";
import ComboVignette from "./ComboVignette";

export function useTypingFeedback(enabled: boolean) {
  const { preferences } = usePreferences();
  const reducedMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const pending = useRef<{ index: number; style: ParticleStyle } | null>(null);
  const impact = useRef<Animation | null>(null);
  const lastImpactAt = useRef(-Infinity);
  const canShake =
    enabled &&
    preferences.screenShake &&
    preferences.effectIntensity > 0 &&
    preferences.graphicsTier !== "low" &&
    !reducedMotion;
  const active = enabled && preferences.comboFeedback;
  const [combo, setCombo] = useState({ active, streak: 0 });
  // A stopped/disabled combo must not reappear on resume or re-enable.
  if (combo.active !== active) setCombo({ active, streak: 0 });
  const reset = useCallback(() => {
    setCombo((current) => ({ ...current, streak: 0 }));
    pending.current = null;
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

  function onEdit(before: Session, after: Session, passage: string) {
    if (!enabled) return;
    const streak = active
      ? advanceCombo(combo.streak, before, after, passage)
      : 0;
    setCombo({ active, streak });
    const feedback = getTypingFeedback(before, after, passage);
    if (!feedback.accepted) return;
    const tier = comboImpact(combo.streak, streak);
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
    if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) return;
    particles.current?.emit(bounds.right + 2, bounds.y + bounds.height / 2);
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
    reset,
    vignetteLayer:
      active && combo.streak >= 10 && preferences.effectIntensity > 0 ? (
        <ComboVignette tier={getCombo(combo.streak).tier} />
      ) : null,
    comboMeter:
      active && combo.streak >= 10 ? (
        <ComboMeter streak={combo.streak} />
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
