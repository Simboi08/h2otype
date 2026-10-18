export type Session = {
  typed: string;
  startedAt: number | null;
  endedAt: number | null;
  now: number;
  attempts: number;
  correctAttempts: number;
};

export const emptySession = (): Session => ({
  typed: "",
  startedAt: null,
  endedAt: null,
  now: 0,
  attempts: 0,
  correctAttempts: 0,
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
  if (current.typed.startsWith(next)) return { ...current, typed: next };
  if (!next.startsWith(current.typed)) return current;
  const added = next.slice(current.typed.length);
  if (!added || /[\r\n]/.test(added)) return current;
  const startedAt = current.startedAt ?? now;
  const correctAdded = [...added].filter(
    (char, index) => char === target[typedLength + index],
  ).length;
  return {
    ...current,
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
