import { dailyDay, replayDaily } from "../src/dailyChallenge.ts";

export type DailyEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
export type Run = {
  id: string;
  day: string;
  started_at: string;
  used: boolean;
  player_id?: string;
};
export type DailyDatabase = {
  begin: (day: string) => Promise<Run>;
  run: (id: string) => Promise<Run | null>;
  list: (day: string) => Promise<unknown[]>;
  complete: (record: Record<string, unknown>) => Promise<void>;
};
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const validDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
function supabase(env: DailyEnvironment): DailyDatabase {
  async function rest(path: string, method = "GET", body?: unknown) {
    const response = await fetch(
      `${env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${path}`,
      {
        method,
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
        redirect: "error",
      },
    );
    if (!response.ok) throw new Error("Database unavailable");
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return {
    begin: async (day) =>
      (await rest("rpc/begin_daily", "POST", { p_day: day }))[0],
    run: async (id) =>
      (
        await rest(
          `daily_runs?id=eq.${id}&select=id,day,started_at,used,player_id`,
        )
      )[0] ?? null,
    list: (day) =>
      rest(
        `daily_scores?day=eq.${day}&select=display_name,score,wpm,accuracy,best_combo&order=score.desc,accuracy.desc,wpm.desc&limit=50`,
      ),
    complete: async (record) => {
      await rest("rpc/complete_daily", "POST", record);
    },
  };
}

export async function handleDaily(
  request: Request,
  env: DailyEnvironment,
  database?: DailyDatabase,
  now = Date.now(),
) {
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (!database && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY))
    return reply({ error: "Shared rankings are not connected yet." }, 503);
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: "Invalid origin." }, 403);
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1_000_000)
      return reply({ error: "Run is too large." }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  const db = database ?? supabase(env);
  try {
    if (body.action === "list") {
      if (!validDay(body.day))
        return reply({ error: "Invalid challenge date." }, 400);
      return reply({ scores: await db.list(body.day) });
    }
    if (body.action === "begin") {
      if (body.day !== dailyDay(new Date(now)))
        return reply({ error: "Start today's challenge." }, 400);
      const run = await db.begin(body.day);
      return reply({ id: run.id });
    }
    if (
      body.action !== "submit" ||
      !uuid(body.id) ||
      !uuid(body.player) ||
      typeof body.name !== "string" ||
      !/^[\p{L}\p{N} _.-]{1,20}$/u.test(body.name.trim())
    )
      return reply(
        {
          error:
            "Use a display name of 1–20 letters, numbers, spaces, dots, underscores or dashes.",
        },
        400,
      );
    const run = await db.run(body.id);
    if (!run)
      return reply({ error: "Run not found. Play again to submit." }, 404);
    if (run.used)
      return run.player_id === body.player
        ? reply({ scores: await db.list(run.day) })
        : reply({ error: "This run has already been submitted." }, 409);
    const elapsed = now - Date.parse(run.started_at);
    // Two seconds of transport tolerance; a browser cannot immediately submit a fabricated test.
    if (!Number.isFinite(elapsed) || elapsed < 58000 || elapsed > 600000)
      return reply(
        { error: "Run expired or finished too early. Play again to submit." },
        409,
      );
    let replay;
    try {
      replay = replayDaily(run.day, body.events);
    } catch {
      return reply(
        { error: "This run could not be verified. Play again to submit." },
        400,
      );
    }
    await db.complete({
      p_id: run.id,
      p_player: body.player,
      p_name: body.name.trim(),
      p_score: replay.score,
      p_wpm: replay.metrics.wpm,
      p_accuracy: replay.metrics.accuracy,
      p_combo: replay.session.bestCombo,
    });
    return reply({ scores: await db.list(run.day) });
  } catch {
    return reply(
      {
        error:
          "Rankings are unavailable. Your local score is saved; try again.",
      },
      503,
    );
  }
}
