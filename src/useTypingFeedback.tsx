import { useEffect, useLayoutEffect, useRef } from "react";
import { usePreferences } from "./preferences";
import type { ParticleStyle } from "./preferences";
import type { Session } from "./typingEngine";
import { getTypingFeedback } from "./typingFeedback";
import { playTypingSound, stopTypingSounds } from "./typingSound";
import TypingParticles from "./TypingParticles";
import type { ParticleHandle } from "./TypingParticles";
import { useReducedMotion } from "./useReducedMotion";

export function useTypingFeedback(enabled: boolean) {
  const { preferences } = usePreferences();
  const reducedMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleHandle>(null);
  const pending = useRef<{ index: number; style: ParticleStyle } | null>(null);

  function onEdit(before: Session, after: Session, passage: string) {
    if (!enabled) return;
    const feedback = getTypingFeedback(before, after, passage);
    if (!feedback.accepted) return;
    playTypingSound(preferences.soundStyle, preferences.soundVolume);
    if (
      feedback.correctIndex !== null &&
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
      if (document.hidden) stopTypingSounds();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stopTypingSounds();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [enabled, preferences.soundStyle, preferences.soundVolume]);

  return {
    container,
    onEdit,
    reset() {
      pending.current = null;
      particles.current?.clear();
      stopTypingSounds();
    },
    layer:
      enabled && preferences.particleStyle !== "off" && !reducedMotion ? (
        <TypingParticles
          key={`${preferences.particleStyle}-${preferences.graphicsTier}`}
          ref={particles}
          style={preferences.particleStyle}
          tier={preferences.graphicsTier}
        />
      ) : null,
  };
}
