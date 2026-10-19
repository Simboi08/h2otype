import { generateWords } from "./wordBank";
import {
  advanceClock,
  editSession,
  emptySession,
  getMetrics,
} from "./typingEngine";
import type { Session } from "./typingEngine";

export const dailyDuration = 60;
export type DailyChallenge = { day: string; passage: string };
export type DailyEvent = {
  at: number;
  add?: string;
  remove?: number;
  reset?: true;
};
export function dailyDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function createDaily(day = dailyDay()): DailyChallenge {
  let seed = 2166136261;
  for (const char of `h2otype-daily-v1:${day}`)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return { day, passage: generateWords("english100", seed, 600).text };
}
export function dailyScore(session: Session) {
  return session.baseXp * 10 + session.bonusTenths;
}
export function dailyEdit(before: Session, after: Session): DailyEvent | null {
  if (after.typed === before.typed) return null;
  const at = Math.max(0, after.now - after.startedAt!);
  return after.typed.length < before.typed.length
    ? { at, remove: [...before.typed].length - [...after.typed].length }
    : { at, add: after.typed.slice(before.typed.length) };
}
// Shared by the game and the optional server: never accept a client-supplied score.
export function replayDaily(day: string, events: unknown) {
  if (!Array.isArray(events) || events.length < 1 || events.length > 12000)
    throw new Error("Invalid run");
  const { passage } = createDaily(day);
  let session = emptySession();
  let previousAt = 0;
  for (const event of events as DailyEvent[]) {
    if (
      !event ||
      typeof event.at !== "number" ||
      !Number.isFinite(event.at) ||
      event.at < previousAt ||
      event.at >= 60000
    )
      throw new Error("Invalid timing");
    if (session.startedAt === null && event.at !== 0)
      throw new Error("Invalid start");
    previousAt = event.at;
    if (
      [
        typeof event.add === "string",
        event.remove !== undefined,
        event.reset === true,
      ].filter(Boolean).length !== 1
    )
      throw new Error("Invalid edit");
    if (event.reset) {
      session = { ...session, streak: 0 };
      continue;
    }
    let next: string;
    if (typeof event.add === "string") {
      if (
        !event.add.length ||
        [...event.add].length > passage.length ||
        /[\r\n]/.test(event.add)
      )
        throw new Error("Invalid characters");
      next = session.typed + event.add;
    } else {
      if (
        !Number.isInteger(event.remove) ||
        event.remove! < 1 ||
        event.remove! > [...session.typed].length
      )
        throw new Error("Invalid deletion");
      next = [...session.typed].slice(0, -event.remove!).join("");
    }
    const updated = editSession(session, next, passage, event.at, 60000);
    if (updated.typed === session.typed || updated.endedAt !== null)
      throw new Error("Invalid edit");
    session = updated;
  }
  session = advanceClock(session, 60000, 60000);
  const metrics = getMetrics(session, passage);
  if (session.startedAt === null || metrics.correctCharacters < 1)
    throw new Error("No correct characters");
  return { session, metrics, score: dailyScore(session) };
}
