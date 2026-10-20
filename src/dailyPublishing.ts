import { dailyDay, dailyRulesVersion } from "./dailyChallenge";
import type { DailyEvent } from "./dailyChallenge";
import { compareDaily, loadDailyRecords } from "./dailyRecords";
import type { DailyRecord } from "./dailyRecords";
import { dailyRequest, sharedRankings } from "./dailyLeaderboard";
import type { DailyRun, RankedScore, Standing } from "./dailyLeaderboard";

const profileKey = "h2otype.daily-guest.v1";
const validId = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
export const validDisplayName = (name: string) =>
  /^[\p{L}\p{N} _.-]{1,20}$/u.test(name.trim());
type Guest = {
  player: string;
  name: string;
  acceptedDay?: string;
  best?: DailyRecord;
  rank?: number;
};
export type Attempt = {
  entry: DailyRecord;
  events: DailyEvent[];
  run: Promise<DailyRun | null> | null;
  token?: string;
  readyAt?: number;
  status: "checking" | "ready" | "sending" | "sent" | "error";
  error?: string;
};
function loadGuest(): Guest {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey) ?? "null");
    const player =
      saved?.player ?? localStorage.getItem("h2otype.daily-player.v1");
    if (validId(player)) {
      const best =
        saved?.rulesVersion === dailyRulesVersion &&
        saved.best &&
        typeof saved.best.day === "string" &&
        [saved.best.score, saved.best.wpm, saved.best.accuracy].every(
          (v: unknown) =>
            typeof v === "number" && Number.isSafeInteger(v) && v >= 0,
        )
          ? (saved.best as DailyRecord)
          : undefined;
      return {
        player,
        name:
          typeof saved?.name === "string" && validDisplayName(saved.name)
            ? saved.name
            : "",
        acceptedDay:
          saved?.rulesVersion === dailyRulesVersion &&
          typeof saved.acceptedDay === "string"
            ? saved.acceptedDay
            : undefined,
        best,
        rank:
          best && Number.isSafeInteger(saved.rank) && saved.rank > 0
            ? saved.rank
            : undefined,
      };
    }
  } catch {
    /* One guest still works for this visit without storage. */
  }
  return { player: crypto.randomUUID(), name: "" };
}

// Lives above the practice modes. Async submissions own immutable run snapshots,
// so restarting or switching modes cannot submit another attempt's edit trace.
export class DailyPublishing {
  private listeners = new Set<() => void>();
  private seen = new Set<string>();
  private loadSequence = 0;
  private followsToday = true;
  private state = {
    today: dailyDay(),
    guest: loadGuest(),
    attempts: {} as Record<string, Attempt>,
    selectedDay: null as string | null,
    prompt: null as string | null,
    scores: [] as RankedScore[],
    standing: null as Standing | null,
    loading: false,
    message: "",
    storageAvailable: true,
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  private patch(next: Partial<typeof this.state>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }
  private save(guest: Guest) {
    let storageAvailable = true;
    try {
      localStorage.setItem(
        profileKey,
        JSON.stringify({ ...guest, rulesVersion: dailyRulesVersion }),
      );
      localStorage.setItem("h2otype.daily-player.v1", guest.player);
    } catch {
      storageAvailable = false;
    }
    this.patch({ guest, storageAvailable });
  }
  private update(attempt: Attempt) {
    if (this.state.attempts[attempt.entry.day]?.entry.id !== attempt.entry.id)
      return false;
    this.patch({
      attempts: { ...this.state.attempts, [attempt.entry.day]: attempt },
    });
    return true;
  }
  offer = (
    entry: DailyRecord,
    events: DailyEvent[],
    run: Promise<DailyRun | null> | null,
  ) => {
    if (!sharedRankings || this.seen.has(entry.id)) return;
    this.seen.add(entry.id);
    const old = this.state.attempts[entry.day];
    const published = this.state.guest.best;
    if (
      (old && compareDaily(entry, old.entry) >= 0) ||
      (published?.day === entry.day && compareDaily(entry, published) >= 0)
    )
      return;
    const attempt: Attempt = {
      entry: { ...entry },
      events: events.map((event) => ({ ...event })),
      run,
      status: "checking",
    };
    this.patch({ attempts: { ...this.state.attempts, [entry.day]: attempt } });
    void this.prepare(attempt);
  };
  private async prepare(attempt: Attempt) {
    const result = await attempt.run;
    const next: Attempt = result?.id
      ? {
          ...attempt,
          token: result.id,
          readyAt: result.readyAt,
          status: "ready",
        }
      : {
          ...attempt,
          status: "error",
          error: `${result?.error ?? "Shared rankings are not connected."} Play a fresh Daily after reconnecting; this score stays on your browser.`,
        };
    if (!this.update(next) || !next.token) return;
    if (
      this.state.guest.acceptedDay === attempt.entry.day &&
      this.state.guest.name
    ) {
      await this.send(next);
    } else if (attempt.entry.day === dailyDay())
      this.patch({ prompt: attempt.entry.id });
  }
  open = (day = dailyDay(), followsToday = true) => {
    this.followsToday = followsToday;
    this.patch({
      selectedDay: day,
      prompt: null,
      scores: [],
      standing: null,
      message: "",
    });
    void this.refresh();
  };
  close = () => {
    this.loadSequence++;
    this.patch({ selectedDay: null, prompt: null, loading: false });
  };
  rollover = () => {
    const today = dailyDay();
    if (today === this.state.today) return;
    this.patch({ today, prompt: null });
    if (this.state.selectedDay && this.followsToday) this.open(today);
  };
  refresh = async () => {
    const day = this.state.selectedDay;
    if (!day || !sharedRankings) return;
    const sequence = ++this.loadSequence;
    this.patch({ loading: true, message: "" });
    try {
      const result = await dailyRequest({
        action: "list",
        day,
        player: this.state.guest.player,
      });
      if (sequence !== this.loadSequence) return;
      this.patch({ scores: result.scores, standing: result.standing ?? null });
      this.rememberStanding(day, result.standing);
    } catch (error) {
      if (sequence === this.loadSequence)
        this.patch({
          message:
            error instanceof Error
              ? error.message
              : "Shared rankings are unavailable. Local scores are below.",
        });
    } finally {
      if (sequence === this.loadSequence) this.patch({ loading: false });
    }
  };
  private rememberStanding(day: string, standing?: Standing | null) {
    if (!standing) return;
    const old = this.state.guest.best;
    const best = {
      id: old?.id ?? "shared",
      day,
      score: standing.score,
      wpm: standing.wpm,
      accuracy: standing.accuracy,
      combo: standing.best_combo,
    };
    // A response for yesterday must not overwrite today's newer entry.
    if (old && old.day > day) return;
    if (old?.day === day && compareDaily(best, old) > 0) return;
    this.save({ ...this.state.guest, best, rank: standing.rank });
  }
  confirm = async (name: string) => {
    const day = this.state.selectedDay;
    const attempt = day ? this.state.attempts[day] : undefined;
    if (!attempt || attempt.status === "sending" || attempt.status === "sent")
      return;
    if (!validDisplayName(name)) {
      this.update({
        ...attempt,
        error:
          "Use 1–20 letters, numbers, spaces, dots, underscores or dashes.",
      });
      return;
    }
    this.save({
      ...this.state.guest,
      name: name.trim(),
      acceptedDay: attempt.entry.day,
    });
    await this.send(attempt);
  };
  retry = (day: string) => {
    const attempt = this.state.attempts[day];
    if (!attempt?.token || attempt.status !== "error") return;
    if (this.state.guest.acceptedDay === day && this.state.guest.name)
      void this.send(attempt);
    else this.open(day, false);
  };
  private async send(attempt: Attempt) {
    if (
      !attempt.token ||
      attempt.status === "sending" ||
      attempt.status === "sent"
    )
      return;
    // Read current status too: double clicks and modal retries share this lock.
    if (this.state.attempts[attempt.entry.day]?.status === "sending") return;
    const sending: Attempt = {
      ...attempt,
      status: "sending",
      error: undefined,
    };
    if (!this.update(sending)) return;
    const guest = this.state.guest;
    try {
      const wait = Math.max(0, (attempt.readyAt ?? 0) - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const result = await dailyRequest({
        action: "submit",
        id: attempt.token,
        player: guest.player,
        name: guest.name,
        events: attempt.events,
      });
      const sent: Attempt = { ...sending, status: "sent" };
      this.update(sent);
      if (
        !this.state.guest.best ||
        this.state.guest.best.day < attempt.entry.day ||
        (this.state.guest.best.day === attempt.entry.day &&
          compareDaily(attempt.entry, this.state.guest.best) < 0)
      )
        this.save({
          ...this.state.guest,
          best: attempt.entry,
          rank: undefined,
        });
      this.rememberStanding(attempt.entry.day, result.standing);
      if (this.state.selectedDay === attempt.entry.day) {
        this.loadSequence++; // A list started before submission cannot replace the new rank.
        this.patch({
          scores: result.scores,
          standing: result.standing ?? null,
          loading: false,
          message: "",
        });
      }
    } catch (error) {
      this.update({
        ...sending,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Could not submit. Your local score is safe; try again.",
      });
    }
  }
  localRecords(day: string) {
    const records = loadDailyRecords().filter((record) => record.day === day);
    const attempt = this.state.attempts[day];
    if (attempt && !records.some((record) => record.id === attempt.entry.id))
      records.push(attempt.entry);
    return records.sort(compareDaily);
  }
}
