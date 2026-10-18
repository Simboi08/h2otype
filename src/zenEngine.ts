import { editSession, emptySession, getMetrics } from "./typingEngine";
import type { Session } from "./typingEngine";

const batches = [
  "there is no hurry to get anywhere. let each word lead to the next, like a path winding softly through the trees on a quiet afternoon.",
  "the station opens at seven. a blue train waits beside the platform while people check their tickets and carry their bags through the doors.",
  "a small wooden table stands near the window. on it are a notebook, a glass of water, and a map folded neatly beside a pencil.",
  "the road follows the river past the old bridge. bicycles pass the market as the shops open and the first delivery arrives.",
  "the library has three floors and a garden at the back. new books sit on a shelf beside the entrance, arranged by the month they arrived.",
  "clouds move across the hills beyond the town. a narrow track crosses the field and joins the main road near a row of stone houses.",
];
export type ZenState = {
  session: Session;
  passage: string;
  batch: number;
  bankedCorrect: number;
  elapsedMs: number;
  runningSince: number | null;
  paused: boolean;
  summary: boolean;
};

export function createZen(): ZenState {
  return {
    session: emptySession(),
    passage: batches[0] + " " + batches[1] + " ",
    batch: 2,
    bankedCorrect: 0,
    elapsedMs: 0,
    runningSince: null,
    paused: false,
    summary: false,
  };
}

export function zenElapsed(state: ZenState, now: number) {
  return (
    state.elapsedMs +
    (state.runningSince === null ? 0 : Math.max(0, now - state.runningSince))
  );
}

export function zenMetrics(state: ZenState, now: number) {
  const elapsedMs = zenElapsed(state, now);
  const metrics = getMetrics(state.session, state.passage);
  const correctCharacters = state.bankedCorrect + metrics.correctCharacters;
  return {
    ...metrics,
    elapsedMs,
    correctCharacters,
    wpm:
      elapsedMs > 0
        ? Math.round(correctCharacters / 5 / (elapsedMs / 60_000))
        : 0,
  };
}

export function editZen(state: ZenState, next: string, now: number): ZenState {
  if (
    state.paused ||
    state.summary ||
    [...next].length > state.passage.length ||
    /[\r\n]/.test(next)
  )
    return state;
  if (
    !next.startsWith(state.session.typed) &&
    !state.session.typed.startsWith(next)
  )
    return state;
  let { passage, batch } = state;
  // Replenish before accepting a boundary character; the shared engine never runs out.
  while (passage.length - [...next].length < 200) {
    passage += batches[batch % batches.length] + " ";
    batch = (batch + 1) % batches.length;
  }
  const session = editSession(state.session, next, passage, now, null);
  let result = {
    ...state,
    passage,
    batch,
    session,
    runningSince: state.runningSince ?? (session.attempts > 0 ? now : null),
  };
  // Retain at least 200 characters for correction; bank older correct characters.
  const typedCharacters = [...session.typed];
  if (typedCharacters.length > 600) {
    const cut =
      typedCharacters.lastIndexOf(" ", typedCharacters.length - 200) + 1;
    if (cut > 0) {
      const correct = typedCharacters
        .slice(0, cut)
        .filter((char, index) => char === passage[index]).length;
      result = {
        ...result,
        bankedCorrect: result.bankedCorrect + correct,
        passage: passage.slice(cut),
        session: { ...session, typed: typedCharacters.slice(cut).join("") },
      };
    }
  }
  return result;
}

export function pauseZen(
  state: ZenState,
  now: number,
  summary = false,
): ZenState {
  return {
    ...state,
    elapsedMs: zenElapsed(state, now),
    runningSince: null,
    paused: true,
    summary: state.summary || summary,
  };
}

export function resumeZen(state: ZenState, now: number): ZenState {
  return {
    ...state,
    paused: false,
    summary: false,
    runningSince: state.session.attempts > 0 ? now : null,
  };
}

// Saved monotonic timestamps cannot be reused in a new page. Restore active elapsed time only.
export function parseZen(raw: string | null): ZenState | null {
  try {
    const data = JSON.parse(raw ?? "null") as {
      version?: unknown;
      state?: ZenState;
    } | null;
    if (data?.version !== 1 || !data.state) return null;
    const state = data.state;
    const finite = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (
      !state.session ||
      typeof state.passage !== "string" ||
      state.passage.length > 2000 ||
      typeof state.session.typed !== "string" ||
      [...state.session.typed].length > 600 ||
      [...state.session.typed].length >= state.passage.length ||
      /[^\x20-\x7e]/.test(state.passage) ||
      /[\r\n]/.test(state.session.typed)
    )
      return null;
    if (
      ![
        state.batch,
        state.bankedCorrect,
        state.elapsedMs,
        state.session.attempts,
        state.session.correctAttempts,
      ].every(finite) ||
      !Number.isInteger(state.batch) ||
      state.batch >= batches.length ||
      state.session.correctAttempts > state.session.attempts ||
      state.bankedCorrect > state.session.correctAttempts ||
      [...state.session.typed].length + state.bankedCorrect >
        state.session.attempts ||
      typeof state.summary !== "boolean"
    )
      return null;
    if (state.session.attempts === 0) return null;
    return {
      ...state,
      session: { ...state.session, startedAt: 0, endedAt: null, now: 0 },
      paused: true,
      runningSince: null,
    };
  } catch {
    return null;
  }
}
