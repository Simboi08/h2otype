import { dailyRulesVersion } from "./dailyChallenge";
export const sharedRankings = import.meta.env.VITE_DAILY_LEADERBOARD === "true";
export type RankedScore = {
  display_name: string;
  score: number;
  wpm: number;
  accuracy: number;
  best_combo: number;
  is_you?: boolean;
};
export type Standing = RankedScore & { rank: number };
export type DailyRun = { id: string | null; error?: string; readyAt?: number };
export async function dailyRequest(body: unknown, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(body as Record<string, unknown>),
        rulesVersion: dailyRulesVersion,
      }),
      signal: controller.signal,
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The leaderboard server is unavailable. Your local score is safe; try again after the site updates.",
      );
    }
    if (!response.ok)
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Rankings are unavailable. Try again.",
      );
    return result;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "The leaderboard connection timed out. Your local score is safe; try again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Could not connect to the leaderboard. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function beginDaily(day: string): Promise<DailyRun | null> {
  if (!sharedRankings) return null;
  try {
    const { id } = await dailyRequest({ action: "begin", day });
    if (typeof id !== "string")
      throw new Error(
        "The leaderboard could not start this run. Play again to submit.",
      );
    // Measuring from receipt is conservative: slow startup/network delivery must
    // not make a legitimate 15-second test look premature to the server.
    return { id, readyAt: Date.now() + 13000 };
  } catch (error) {
    return {
      id: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not start an online run. Play again to submit.",
    };
  }
}
