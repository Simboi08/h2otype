import type { Session } from "./typingEngine";

export const comboThresholds = [25, 60, 120, 200, 350] as const;

export const comboBonusTenths = [0, 2, 5, 10, 15, 20] as const;

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

export const comboDecayRates = [1.5, 3, 5, 8, 12, 16] as const;

// Integrate across tier boundaries so delayed ticks and server replay agree exactly.
export function decayCombo(
  streak: number,
  fraction: number,
  elapsedMs: number,
) {
  let charge = Math.max(0, streak - fraction);
  let seconds = Math.max(0, elapsedMs) / 1000;
  while (charge > 1e-9 && seconds > 1e-9) {
    const whole = Math.ceil(charge - 1e-9);
    const tier = comboThresholds.filter(
      (threshold) => whole >= threshold,
    ).length;
    const boundary = tier ? comboThresholds[tier - 1] - 1 : 0;
    const rate = comboDecayRates[tier];
    const duration = (charge - boundary) / rate;
    if (seconds < duration) {
      charge -= seconds * rate;
      break;
    }
    charge = boundary;
    seconds -= duration;
  }
  const remaining = Math.max(0, Math.ceil(charge - 1e-9));
  return {
    streak: remaining,
    comboDecayFraction: Math.max(0, Math.min(1 - 1e-9, remaining - charge)),
  };
}

export function getCombo(streak: number, fraction = 0) {
  const tier = comboThresholds.filter(
    (threshold) => streak >= threshold,
  ).length;
  const next = comboThresholds[tier] ?? null;
  const start = tier ? comboThresholds[tier - 1] : 0;
  const end = next ?? comboThresholds[4];
  return {
    tier,
    bonusTenths: comboBonusTenths[tier],
    multiplier: 1 + comboBonusTenths[tier] / 10,
    next,
    // Each stage fills toward its actual upgrade target. The maximum tier
    // instead shows remaining total charge, since it has no further upgrade.
    percent: next
      ? Math.max(
          0,
          Math.min(100, ((streak - fraction - start) / (end - start)) * 100),
        )
      : Math.max(0, Math.min(100, ((streak - fraction) / end) * 100)),
    pitch: Math.pow(
      2,
      Math.min(7, Math.max(0, streak - comboThresholds[0]) / 40) / 12,
    ),
  };
}

// Impacts are discrete rewards, rather than constant shaking on every key.
export function comboImpact(before: number, after: number) {
  if (after <= before || after < comboThresholds[0]) return 0;
  const tier = getCombo(after).tier;
  return tier > getCombo(before).tier ? tier : 0;
}

export function impactProfile(intensity: number, tier: number) {
  return intensity === 2
    ? { strength: Math.min(8, 2 + tier * 1.1), duration: 220, cooldown: 120 }
    : { strength: 0.8, duration: 160, cooldown: 250 };
}
