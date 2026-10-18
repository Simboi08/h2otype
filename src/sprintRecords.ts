export const sprintDurations = [15, 30, 60] as const;
export type SprintDuration = (typeof sprintDurations)[number];
export type Best = { wpm: number; accuracy: number };
export type Bests = Partial<Record<SprintDuration, Best>>;
const key = "h2otype.sprint-bests.v1";

export function parseBests(raw: string | null): Bests {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1 ||
      !("bests" in data) ||
      !data.bests ||
      typeof data.bests !== "object"
    )
      return {};
    const bests: Bests = {};
    for (const duration of sprintDurations) {
      const value: unknown = (data.bests as Record<string, unknown>)[duration];
      if (
        !value ||
        typeof value !== "object" ||
        !("wpm" in value) ||
        !("accuracy" in value)
      )
        continue;
      const { wpm, accuracy } = value;
      if (
        typeof wpm === "number" &&
        Number.isFinite(wpm) &&
        wpm >= 0 &&
        typeof accuracy === "number" &&
        Number.isFinite(accuracy) &&
        accuracy >= 0 &&
        accuracy <= 100
      )
        bests[duration] = { wpm, accuracy };
    }
    return bests;
  } catch {
    return {};
  }
}

export function isBetter(candidate: Best, previous?: Best) {
  return (
    !previous ||
    candidate.wpm > previous.wpm ||
    (candidate.wpm === previous.wpm && candidate.accuracy > previous.accuracy)
  );
}

export function recordSprint(
  duration: SprintDuration,
  candidate: Best,
  eligible: boolean,
) {
  let bests: Bests = {};
  let available = true;
  try {
    bests = parseBests(localStorage.getItem(key));
  } catch {
    available = false;
  }
  const newBest = eligible && isBetter(candidate, bests[duration]);
  if (newBest) bests[duration] = candidate;
  if (available && newBest) {
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, bests }));
    } catch {
      available = false;
    }
  }
  return { best: bests[duration], newBest, available };
}
