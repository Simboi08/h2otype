import {
  dailyDay,
  dailyDuration,
  replayDaily,
  dailyRulesVersion,
} from "../src/dailyChallenge.js";

export type DailyEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
};
export type Run = {
  id: string;
  day: string;
  started_at: string;
  used: boolean;
  rules_version: number;
  player_id?: string;
};
export type DailyDatabase = {
  begin: (day: string) => Promise<Run>;
  run: (id: string) => Promise<Run | null>;
  list: (day: string) => Promise<unknown[]>;
  complete: (record: Record<string, unknown>) => Promise<void>;
  standing?: (
    day: string,
    player: string,
  ) => Promise<Record<string, unknown> | null>;
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
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SECRET_KEY)!.trim();
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(
      `${env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${path}`,
      {
        method,
        headers: {
          apikey: key,
          ...(key.startsWith("sb_secret_")
            ? {}
            : { Authorization: `Bearer ${key}` }),
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
        redirect: "error",
      },
    );
    if (!response.ok) throw new Error("Database unavailable");
    return response;
  }
  async function rest(path: string, method = "GET", body?: unknown) {
    const response = await request(path, method, body);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return {
    begin: async (day) =>
      (
        await rest("rpc/begin_daily", "POST", {
          p_day: day,
          p_rules_version: dailyRulesVersion,
        })
      )[0],
    run: async (id) =>
      (
        await rest(
          `daily_runs?id=eq.${id}&select=id,day,started_at,used,player_id,rules_version`,
        )
      )[0] ?? null,
    list: (day) =>
      rest(
        `daily_scores?day=eq.${day}&rules_version=eq.${dailyRulesVersion}&select=player_id,display_name,score,wpm,accuracy,best_combo&order=score.desc,accuracy.desc,wpm.desc&limit=50`,
      ),
    standing: async (day, player) => {
      const scope = `day=eq.${day}&rules_version=eq.${dailyRulesVersion}`;
      const own = (
        await rest(
          `daily_scores?${scope}&player_id=eq.${player}&select=display_name,score,wpm,accuracy,best_combo&limit=1`,
        )
      )[0];
      if (!own) return null;
      const { score, accuracy, wpm } = own;
      if (
        ![score, accuracy, wpm].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        )
      )
        throw new Error("Invalid standing");
      const response = await request(
        `daily_scores?${scope}&or=(score.gt.${score},and(score.eq.${score},accuracy.gt.${accuracy}),and(score.eq.${score},accuracy.eq.${accuracy},wpm.gt.${wpm}))&select=score`,
        "HEAD",
        undefined,
        { Prefer: "count=exact" },
      );
      const count = Number(
        response.headers.get("content-range")?.split("/")[1],
      );
      if (!Number.isSafeInteger(count) || count < 0)
        throw new Error("Invalid rank");
      return { ...own, rank: count + 1 };
    },
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
  if (
    !database &&
    (!env.SUPABASE_URL ||
      !(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY))
  )
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
  if (body.rulesVersion !== dailyRulesVersion)
    return reply(
      {
        error:
          "Challenge rules have changed. Refresh the page and start a new run.",
      },
      409,
    );
  const db = database ?? supabase(env);
  async function leaderboard(day: string, player?: unknown) {
    const [scores, standing] = await Promise.all([
      db.list(day),
      uuid(player) && db.standing ? db.standing(day, player) : undefined,
    ]);
    return {
      scores: scores.map((record) => {
        const { player_id, ...score } = record as Record<string, unknown>;
        return {
          ...score,
          ...(uuid(player) && player_id
            ? { is_you: player_id === player }
            : {}),
        };
      }),
      ...(standing !== undefined ? { standing } : {}),
    };
  }
  try {
    if (body.action === "list") {
      if (!validDay(body.day))
        return reply({ error: "Invalid challenge date." }, 400);
      return reply(await leaderboard(body.day, body.player));
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
    if (run.rules_version !== dailyRulesVersion)
      return reply(
        { error: "Challenge rules have changed. Play a fresh run to submit." },
        409,
      );
    if (run.used)
      return run.player_id === body.player
        ? reply(await leaderboard(run.day, body.player))
        : reply({ error: "This run has already been submitted." }, 409);
    const elapsed = now - Date.parse(run.started_at);
    // Two seconds of transport tolerance; a browser cannot immediately submit a fabricated test.
    if (
      !Number.isFinite(elapsed) ||
      elapsed < (dailyDuration - 2) * 1000 ||
      elapsed > 600000
    )
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
    return reply(await leaderboard(run.day, body.player));
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
