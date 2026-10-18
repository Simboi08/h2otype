export const MAX_XP = 1_000_000_000_000;

export function levelThreshold(level: number) {
  return 50 * level * (level - 1);
}

export function getLevel(totalXp: number) {
  const xp = Number.isSafeInteger(totalXp)
    ? Math.min(MAX_XP, Math.max(0, totalXp))
    : 0;
  let level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  while (levelThreshold(level + 1) <= xp) level++;
  while (levelThreshold(level) > xp) level--;
  const current = xp - levelThreshold(level);
  const required = 100 * level;
  return { level, current, required, percent: (current / required) * 100 };
}
