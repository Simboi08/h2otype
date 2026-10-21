import { useSyncExternalStore } from "react";
import { usePreferences } from "./preferences";
import { useReducedMotion } from "./useReducedMotion";

function subscribe(listener: () => void) {
  window.addEventListener("typing-particle-status", listener);
  return () => window.removeEventListener("typing-particle-status", listener);
}
function snapshot() {
  return (
    document.querySelector<HTMLCanvasElement>(".typing-particles")?.dataset
      .renderer ?? "idle"
  );
}

export default function ParticleStatus() {
  const { preferences } = usePreferences();
  const reduced = useReducedMotion();
  const renderer = useSyncExternalStore(subscribe, snapshot);
  const message = reduced
    ? "Particles paused: your device requests reduced motion. On iPad, check Settings → Accessibility → Motion → Reduce Motion."
    : preferences.particleStyle === "off"
      ? "Particles are switched off."
      : preferences.effectIntensity === 0
        ? "Particles paused: Visual effects is set to Off."
        : renderer === "unavailable"
          ? "Particle drawing is unavailable in this browser. Typing and scoring still work."
          : renderer === "ready"
            ? "Particle renderer ready. Correct letters emit particles; mistakes do not."
            : "Particles appear during active practice. Resume or restart to test them.";
  return (
    <p className="settings-note particle-status" role="status">
      {message}
    </p>
  );
}
