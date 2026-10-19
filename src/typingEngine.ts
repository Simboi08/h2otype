import { getCombo } from "./combo";

export type Session = {
  typed: string;
  startedAt: number | null;
  endedAt: number | null;
  now: number;
  attempts: number;
  correctAttempts: number;
  credited: number[];
  xpEarned: number;
  baseXp: number;
  bonusTenths: number;
  streak: number;
  bestCombo: number;
};

export const emptySession = (): Session => ({
  typed: "",
  startedAt: null,
  endedAt: null,
  now: 0,
  attempts: 0,
  correctAttempts: 0,
  credited: [],
  xpEarned: 0,
  baseXp: 0,
  bonusTenths: 0,
  streak: 0,
  bestCombo: 0,
});

export function advanceClock(
  state: Session,
  now: number,
  durationMs: number | null,
): Session {
  if (state.startedAt === null || state.endedAt !== null) return state;
  const deadline =
    durationMs === null ? Infinity : state.startedAt + durationMs;
  return {
    ...state,
    now: Math.max(state.now, Math.min(now, deadline)),
    endedAt: now >= deadline ? deadline : null,
  };
}

// Editing is deliberately append/backspace only: character positions stay predictable.
export function editSession(
  state: Session,
  next: string,
  passage: string,
  now: number,
  durationMs: number | null,
): Session {
  const current = advanceClock(state, now, durationMs);
  const target = [...passage];
  const nextCharacters = [...next];
  const typedLength = [...current.typed].length;
  if (current.endedAt !== null || nextCharacters.length > target.length)
    return current;
  if (current.typed.startsWith(next))
    return {
      ...current,
      typed: next,
      streak: next === current.typed ? current.streak : 0,
    };
  if (!next.startsWith(current.typed)) return current;
  const added = next.slice(current.typed.length);
  if (!added || /[\r\n]/.test(added)) return current;
  const startedAt = current.startedAt ?? now;
  const correctAdded = [...added].filter(
    (char, index) => char === target[typedLength + index],
  ).length;
  const credited = new Set(current.credited);
  let xpAdded = 0;
  let { streak, bestCombo, bonusTenths } = current;
  [...added].forEach((char, index) => {
    const position = typedLength + index;
    if (char !== target[position]) streak = 0;
    else if (!credited.has(position)) {
      streak++;
      bestCombo = Math.max(bestCombo, streak);
      bonusTenths += getCombo(streak).tier;
      credited.add(position);
      xpAdded++;
    }
  });
  return {
    ...current,
    credited: [...credited],
    baseXp: current.baseXp + xpAdded,
    bonusTenths,
    streak,
    bestCombo,
    xpEarned: current.baseXp + xpAdded + Math.floor(bonusTenths / 10),
    typed: next,
    startedAt,
    now,
    endedAt: nextCharacters.length === target.length ? now : null,
    attempts: current.attempts + [...added].length,
    correctAttempts: current.correctAttempts + correctAdded,
  };
}

export function getMetrics(state: Session, passage: string) {
  const elapsedMs =
    state.startedAt === null
      ? 0
      : Math.max(0, (state.endedAt ?? state.now) - state.startedAt);
  const target = [...passage];
  const correctCharacters = [...state.typed].filter(
    (char, index) => char === target[index],
  ).length;
  return {
    elapsedMs,
    correctCharacters,
    errors: state.attempts - state.correctAttempts,
    wpm:
      elapsedMs > 0
        ? Math.round(correctCharacters / 5 / (elapsedMs / 60_000))
        : 0,
    accuracy:
      state.attempts > 0
        ? Math.round((state.correctAttempts / state.attempts) * 100)
        : 100,
  };
}

// Only the active word is displayed in the input. Completed text stays in session history.
export function getWordInput(typed: string) {
  const boundary = typed.lastIndexOf(" ") + 1;
  return { prefix: typed.slice(0, boundary), word: typed.slice(boundary) };
}
