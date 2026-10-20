import type { GraphicsTier } from "./preferences";

export const graphicsProfiles = {
  low: {
    burst: 3,
    maximum: 24,
    pixelBurst: 2,
    pixelMaximum: 12,
    lifetime: 240,
    resolution: 1,
    fps: 30,
    speed: 55,
    xpDuration: 0,
  },
  medium: {
    burst: 7,
    maximum: 70,
    pixelBurst: 4,
    pixelMaximum: 24,
    lifetime: 400,
    resolution: 1.5,
    fps: 0,
    speed: 80,
    xpDuration: 600,
  },
  high: {
    burst: 12,
    maximum: 144,
    pixelBurst: 6,
    pixelMaximum: 36,
    lifetime: 520,
    resolution: 2,
    fps: 0,
    speed: 110,
    xpDuration: 850,
  },
} as const;
export function particleVelocity(
  angleSample: number,
  speedSample: number,
  tier: GraphicsTier,
) {
  const angle = (angleSample - 0.5) * Math.PI;
  const speed = graphicsProfiles[tier].speed * (0.6 + speedSample * 0.6);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
export function easeXp(progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
