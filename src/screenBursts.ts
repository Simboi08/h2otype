import type { GraphicsTier } from "./preferences";

export type BurstKind = "finish" | "combo";
export function burstProfile(
  kind: BurstKind,
  quality: GraphicsTier,
  intensity: number,
) {
  const maximum =
    kind === "finish"
      ? quality === "high"
        ? 32
        : 20
      : quality === "high"
        ? 20
        : 12;
  return {
    count:
      quality === "low" || intensity === 0
        ? 0
        : intensity === 1
          ? Math.floor(maximum / 2)
          : maximum,
    duration: kind === "finish" ? 1400 : 750,
  };
}
// Owned, short-lived Web Animations; no animation loop or accumulating particles.
export function playScreenBurst(
  layer: HTMLDivElement,
  kind: BurstKind,
  quality: GraphicsTier,
  intensity: number,
  tier = 1,
) {
  const profile = burstProfile(kind, quality, intensity);
  const animations: Animation[] = [];
  const sample = (index: number) =>
    ((index * 137.508 + tier * 31.4) % 100) / 100;
  const colors = ["var(--accent)", "var(--pink)", "#efbb57"];
  for (let index = 0; index < profile.count; index++) {
    const left = index % 2 === 0;
    const unit = sample(index);
    const particle = document.createElement("i");
    particle.style.background = colors[index % colors.length];
    particle.style.width = `${kind === "finish" ? 4 + unit * 3 : 3 + unit * 2}px`;
    particle.style.height = `${kind === "finish" ? 6 + unit * 4 : 3 + unit * 2}px`;
    particle.style.left = `${left ? 5 : innerWidth - 10}px`;
    particle.style.top = `${innerHeight * (kind === "finish" ? 0.12 : 0.3 + unit * 0.5)}px`;
    layer.append(particle);
    const direction = left ? 1 : -1;
    const distance = Math.min(
      innerWidth * (kind === "finish" ? 0.27 : 0.12),
      kind === "finish" ? 210 : 110,
    );
    const x = direction * distance * (0.35 + unit * 0.65);
    const y =
      kind === "finish"
        ? 80 + unit * Math.min(innerHeight * 0.5, 280)
        : -60 + unit * 120;
    animations.push(
      particle.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: 0 },
          {
            transform: `translate(${x * 0.35}px, ${kind === "finish" ? -25 : y * 0.35}px) rotate(70deg) scale(1)`,
            opacity: intensity === 1 ? 0.55 : 0.85,
            offset: 0.2,
          },
          {
            transform: `translate(${x}px, ${y}px) rotate(${kind === "finish" ? 240 : 110}deg) scale(0.3)`,
            opacity: 0,
          },
        ],
        {
          duration: profile.duration,
          easing: "cubic-bezier(0.15, 0.5, 0.4, 1)",
          fill: "both",
        },
      ),
    );
  }
  const clear = () => {
    clearTimeout(timer);
    animations.forEach((animation) => animation.cancel());
    layer.replaceChildren();
  };
  const timer = setTimeout(clear, profile.duration);
  return clear;
}
