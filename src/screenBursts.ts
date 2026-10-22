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
function sample(kind: BurstKind, index: number, tier: number, salt = 0) {
  if (kind === "combo") return ((index * 137.508 + tier * 31.4) % 100) / 100;
  let value = Math.imul(index + 1 + salt * 997, 0x45d9f3b) ^ (tier * 7919);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function burstPath(
  kind: BurstKind,
  index: number,
  width: number,
  height: number,
  tier = 1,
) {
  const unit = sample(kind, index, tier);
  if (kind === "combo") {
    const left = index % 2 === 0;
    return {
      edge: left ? "left" : "right",
      left: left ? 5 : width - 10,
      top: height * (0.3 + unit * 0.5),
      x: (left ? 1 : -1) * Math.min(width * 0.12, 110) * (0.35 + unit * 0.65),
      y: -60 + unit * 120,
    };
  }
  // Most pieces cover the full sides; lighter top/bottom sprays fill the perimeter.
  const group = index % 20;
  const edge =
    group < 7 ? "left" : group < 14 ? "right" : group < 18 ? "top" : "bottom";
  const travel = sample(kind, index, tier, 1);
  const fall = sample(kind, index, tier, 2);
  const launch = sample(kind, index, tier, 3);
  if (edge === "left" || edge === "right") {
    const top = height * (0.06 + launch * 0.88);
    return {
      edge,
      left: edge === "left" ? 5 : width - 10,
      top,
      x:
        (edge === "left" ? 1 : -1) *
        Math.min(width * 0.35, 400) *
        (0.25 + travel * 0.75),
      y:
        (top > height / 2 ? -1 : 1) *
        Math.min(height * 0.35, 260) *
        (0.2 + fall * 0.8),
    };
  }
  const left = width * (0.04 + launch * 0.92);
  const drift = (travel - 0.5) * Math.min(width * 0.3, 300);
  return {
    edge,
    left,
    top: edge === "top" ? 5 : height - 10,
    x: Math.max(5 - left, Math.min(width - 10 - left, drift)),
    y:
      (edge === "top" ? 1 : -1) *
      Math.min(height * 0.65, 550) *
      (0.4 + fall * 0.6),
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
  const colors = ["var(--accent)", "var(--pink)", "#efbb57"];
  for (let index = 0; index < profile.count; index++) {
    const unit = sample(kind, index, tier);
    const path = burstPath(kind, index, innerWidth, innerHeight, tier);
    const particle = document.createElement("i");
    particle.dataset.edge = path.edge;
    particle.style.background = colors[index % colors.length];
    particle.style.width = `${kind === "finish" ? 6 + unit * 4 : 5 + Math.min(5, tier) * 1.5 + unit * 2}px`;
    particle.style.height = `${kind === "finish" ? 8 + unit * 6 : 5 + Math.min(5, tier) * 1.5 + unit * 2}px`;
    particle.style.left = `${path.left}px`;
    particle.style.top = `${path.top}px`;
    layer.append(particle);
    animations.push(
      particle.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(0.6)", opacity: 0 },
          {
            transform: `translate(${path.x * 0.35}px, ${path.y * (kind === "finish" ? 0.2 : 0.35)}px) rotate(70deg) scale(1)`,
            opacity: intensity === 1 ? 0.55 : kind === "finish" ? 0.95 : 0.85,
            offset: 0.2,
          },
          {
            transform: `translate(${path.x}px, ${path.y}px) rotate(${kind === "finish" ? 240 : 110}deg) scale(0.3)`,
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
