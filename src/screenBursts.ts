import type { GraphicsTier } from "./preferences";

export type BurstKind = "finish" | "combo";
export function burstProfile(
  kind: BurstKind,
  quality: GraphicsTier,
  intensity: number,
  amount = 100,
) {
  const maximum =
    kind === "finish"
      ? quality === "high"
        ? 160
        : 100
      : quality === "high"
        ? 20
        : 12;
  return {
    count:
      quality === "low" || intensity === 0
        ? 0
        : intensity === 1
          ? Math.round((maximum * (kind === "finish" ? amount / 100 : 1)) / 2)
          : Math.round(maximum * (kind === "finish" ? amount / 100 : 1)),
    duration: kind === "finish" ? 2200 : 750,
  };
}
// Owned, short-lived Web Animations; no animation loop or accumulating particles.
export function playScreenBurst(
  layer: HTMLDivElement,
  kind: BurstKind,
  quality: GraphicsTier,
  intensity: number,
  tier = 1,
  amount = 100,
) {
  const profile = burstProfile(kind, quality, intensity, amount);
  const animations: Animation[] = [];
  // Independent finish samples avoid stacking hundreds of pieces on a few paths.
  const sample = (index: number, salt = 0) => {
    if (kind === "combo") return ((index * 137.508 + tier * 31.4) % 100) / 100;
    let value = Math.imul(index + 1 + salt * 997, 0x45d9f3b) ^ (tier * 7919);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
  const colors = ["var(--accent)", "var(--pink)", "#efbb57"];
  for (let index = 0; index < profile.count; index++) {
    const left = index % 2 === 0;
    const unit = sample(index);
    const travel = sample(index, 1);
    const fall = sample(index, 2);
    const launch = sample(index, 3);
    const particle = document.createElement("i");
    particle.style.background = colors[index % colors.length];
    particle.style.width = `${kind === "finish" ? 6 + unit * 4 : 3 + unit * 2}px`;
    particle.style.height = `${kind === "finish" ? 8 + unit * 6 : 3 + unit * 2}px`;
    particle.style.left = `${left ? 5 : innerWidth - 10}px`;
    particle.style.top = `${innerHeight * (kind === "finish" ? 0.08 + launch * 0.16 : 0.3 + unit * 0.5)}px`;
    layer.append(particle);
    const direction = left ? 1 : -1;
    const distance = Math.min(
      innerWidth * (kind === "finish" ? 0.45 : 0.12),
      kind === "finish" ? 480 : 110,
    );
    const x = direction * distance * (0.35 + travel * 0.65);
    const y =
      kind === "finish"
        ? 180 + fall * Math.min(innerHeight * 0.85, 650)
        : -60 + unit * 120;
    animations.push(
      particle.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: 0 },
          {
            transform: `translate(${x * 0.35}px, ${kind === "finish" ? -25 : y * 0.35}px) rotate(70deg) scale(1)`,
            opacity: intensity === 1 ? 0.55 : kind === "finish" ? 0.95 : 0.85,
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
