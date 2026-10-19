import type { Session } from "./typingEngine";

export const comboThresholds = [10, 25, 50, 100, 200] as const;

// Shared combo thresholds; pure transitions are also used in reward validation.
export function advanceCombo(
  streak: number,
  before: Session,
  after: Session,
  passage: string,
) {
  const added = after.attempts - before.attempts;
  if (added <= 0) return after.typed === before.typed ? streak : 0;
  const typed = [...after.typed];
  const target = [...passage];
  const retired = [...before.typed].length + added - typed.length;
  const credited = new Set(before.credited);
  for (
    let index = Math.max(0, typed.length - added);
    index < typed.length;
    index++
  ) {
    if (typed[index] !== target[index]) streak = 0;
    else if (!credited.has(index + retired)) streak++;
  }
  return streak;
}

export function getCombo(streak: number) {
  const tier = comboThresholds.filter(
    (threshold) => streak >= threshold,
  ).length;
  const start = tier ? comboThresholds[tier - 1] : 0;
  const next = comboThresholds[tier] ?? null;
  return {
    tier,
    multiplier: 1 + tier / 10,
    next,
    percent: next === null ? 100 : ((streak - start) / (next - start)) * 100,
    pitch: Math.pow(2, Math.min(7, Math.max(0, streak - 10) / 25) / 12),
  };
}

// Impacts are discrete rewards, rather than constant shaking on every key.
export function comboImpact(before: number, after: number) {
  if (after <= before || after < 10) return 0;
  const tier = getCombo(after).tier;
  return tier > getCombo(before).tier ? tier : 0;
}

export function impactProfile(intensity: number, tier: number) {
  return intensity === 2
    ? { strength: Math.min(8, 2 + tier * 1.1), duration: 220, cooldown: 120 }
    : { strength: 0.8, duration: 160, cooldown: 250 };
}
