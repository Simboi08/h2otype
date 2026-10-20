import { dailyRulesVersion } from "./dailyChallenge";
export const sharedRankings = import.meta.env.VITE_DAILY_LEADERBOARD === "true";
export type RankedScore = {
  display_name: string;
  score: number;
  wpm: number;
  accuracy: number;
  best_combo: number;
};
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
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Rankings are unavailable. Try again.",
      );
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function beginDaily(day: string) {
  if (!sharedRankings) return null;
  try {
    return (await dailyRequest({ action: "begin", day })).id as string;
  } catch {
    return null;
  }
}
