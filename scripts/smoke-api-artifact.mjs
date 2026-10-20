import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import process from "node:process";

// This script imports ONLY the shipped JavaScript from the supplied artifact.
// It also accepts the output of @vercel/node to validate real function packaging.
const root = resolve(process.argv[2]);
// These values are synthetic. No live credentials or network are used.
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "build-test-service-key";
delete process.env.SUPABASE_SECRET_KEY;
const { default: handler } = await import(
  pathToFileURL(join(root, "api/daily.js")).href
);
const { createDaily, dailyRulesVersion } = await import(
  pathToFileURL(join(root, "src/dailyChallenge.js")).href
);
const day = new Date().toISOString().slice(0, 10);
const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const player = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const run = {
  id,
  day,
  started_at: new Date(Date.now() - 15000).toISOString(),
  used: false,
  rules_version: dailyRulesVersion,
  player_id: player,
};
const record = {
  display_name: "Build test",
  score: 1275,
  wpm: 80,
  accuracy: 100,
  best_combo: 100,
};
let completions = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://example.supabase.co");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("apikey"), "build-test-service-key");
  if (url.pathname.endsWith("/rpc/begin_daily")) return Response.json([run]);
  if (url.pathname.endsWith("/daily_runs")) return Response.json([run]);
  if (url.pathname.endsWith("/rpc/complete_daily")) {
    const body = JSON.parse(init.body);
    assert.equal(body.p_score, 1275);
    assert.equal(body.p_wpm, 80);
    assert.equal(body.p_name, "Build test");
    completions++;
    run.used = true;
    return new Response(null, { status: 204 });
  }
  assert.ok(url.pathname.endsWith("/daily_scores"));
  if (init.method === "HEAD")
    return new Response(null, { headers: { "Content-Range": "*/0" } });
  return Response.json(
    completions
      ? [
          {
            ...record,
            ...(url.searchParams.has("player_id") ? {} : { player_id: player }),
          },
        ]
      : [],
  );
};
async function call(body, method = "POST") {
  let status;
  let text;
  const headers = {};
  await handler(
    {
      method,
      headers: { host: "h2otype.test", origin: "https://h2otype.test" },
      body: { rulesVersion: dailyRulesVersion, ...body },
    },
    {
      set statusCode(value) {
        status = value;
      },
      setHeader(key, value) {
        headers[key] = value;
      },
      end(value) {
        text = value;
      },
    },
  );
  return { status, data: JSON.parse(text), headers };
}
assert.equal((await call({}, "GET")).status, 405);
assert.equal((await call({ action: "list", day })).status, 200);
assert.deepEqual((await call({ action: "begin", day })).data, { id });
const submission = {
  action: "submit",
  id,
  player,
  name: "Build test",
  events: [{ at: 0, add: createDaily(day).passage.slice(0, 100) }],
  score: 999999,
};
const result = await call(submission);
assert.equal(result.status, 200);
assert.equal(result.headers["cache-control"], "no-store");
assert.deepEqual(result.data.scores, [{ ...record, is_you: true }]);
assert.deepEqual(result.data.standing, { ...record, rank: 1 });
assert.ok(!JSON.stringify(result.data).includes(player));
assert.equal((await call(submission)).status, 200);
assert.equal(completions, 1);
if (existsSync(join(root, "functions/api/daily.js"))) {
  const { onRequest } = await import(
    pathToFileURL(join(root, "functions/api/daily.js")).href
  );
  const response = await onRequest({
    request: new Request("https://h2otype.test/api/daily", {
      method: "POST",
      body: JSON.stringify({
        action: "list",
        day,
        rulesVersion: dailyRulesVersion,
      }),
    }),
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "build-test-service-key",
    },
  });
  assert.equal(response.status, 200);
}
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal((await call({ action: "list", day })).status, 503);
process.stdout.write(
  "PASS compiled API artifact: GET, list, begin, replayed submission, standing, idempotent retry and missing configuration\n",
);
