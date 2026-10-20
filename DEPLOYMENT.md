# Publish a playtest

The game and local Daily scores work as a static Vite site. No domain purchase,
account system, or database is needed for that version. XP and local records
belong to each browser/origin; localhost progress does not move to the public URL.

## Vercel

1. Import `Simboi08/h2otype` from GitHub.
2. Use the branch with the current game: `codex/milestone-1-typing-engine`.
   If the import used `main`, change the project's production branch and deploy
   the game branch.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`.
4. Deploy and share the generated `.vercel.app` URL. Future pushes to the
   configured branch trigger updates.

`api/daily.ts` is the optional Vercel function for shared rankings.

## Cloudflare Pages

Create a **Pages** project connected to the same GitHub repository and branch.
Use `npm run build`, output `dist`, and Node 22.12+ or 24. Share the generated
`.pages.dev` URL. Use Pages rather than a generic Worker deployment;
`functions/api/daily.ts` supplies the optional API.

## Optional shared Daily leaderboard

Local Daily rankings are clearly labelled **Scores on this browser**. To enable
rankings across visitors:

1. Create a Supabase project and run [supabase/daily.sql](supabase/daily.sql)
   in its SQL Editor. This creates the private run/score tables and service-only
   database functions. The script can be run again safely.
2. In your hosting project's **server environment**, set `SUPABASE_URL` to the
   project URL and `SUPABASE_SERVICE_ROLE_KEY` to its private service-role JWT
   from **Project Settings → API Keys → Legacy anon, service_role API keys**
   (reveal `service_role`, not `anon`). This integration uses that legacy JWT.
   Keep these on the server; never give the key a `VITE_` prefix, paste it into
   source files, or share it in chat. Modern Supabase server secret keys are also
   supported: save a newly created private key under `SUPABASE_SECRET_KEY` instead
   of `SUPABASE_SERVICE_ROLE_KEY` if using that option. No publishable key or JWKS
   URL is required for this guest leaderboard.
   In Vercel, open **Project → Settings → Environment Variables** and select
   **Production** (and **Preview** if testing a branch deployment) for all three
   values. The URL is under Supabase **Project Settings → Data API**.
3. Set the public build flag `VITE_DAILY_LEADERBOARD=true`. Deploy the
   **latest commit** after saving the variables so Vite includes the shared
   rankings interface. Cloudflare Pages also needs the two private values
   available to its Functions runtime.
4. The **Leaderboard** button beneath the logo is available before playing.
   Complete Daily: the first qualifying connected run prompts for a display name
   and **Submit score**. The prompt explains that better runs update automatically
   for the rest of that UTC day. Your rank appears beside Leaderboard; midnight
   clears today's badge and asks again. **Not now** leaves the score local.
   Keep the flag false/unset if you only want the static game.

The server issues a run token when the first character starts a test, checks
its age (13 seconds to ten minutes,
including transport tolerance), replays accepted edits against that day's fixed
passage, and computes points itself. Submission is atomic and keeps only the
best score per browser guest per day; ties use accuracy then WPM. Reloading or
clearing browser storage creates a different guest identity. Run tokens older
than two days are cleaned up when a new run starts. Failed connections keep the
local result available and offer submission retry.

This is a guest playtest leaderboard, not verified human competition: scripted
input and new guest identities remain possible. Accounts, stronger competition
verification, and moderation can follow real tester feedback. Scores and display
names are public; XP, typing preferences and Zen drafts stay local.

Supabase is now requested for activation. No player accounts are required: the
browser keeps a random guest identity and players choose a display name when
submitting. Credentials are not available in this development environment, so a
real hosted submission must be verified after the project is configured. Tests
cover the actual REST adapter's private authentication, versioned queries,
server-calculated submissions and connection failures, as well as the SQL upgrade
in a PostgreSQL-compatible local engine.

Daily uses **rules version 4** for time-decaying combos. Run the current SQL
before deploying the matching client/handlers; rerunning it preserves old scores
under their original versions. The SQL also supports version 3 for an older
15-second deployment during rollout, but each deployed handler only accepts its
own rules and lists that version's scores. Older browser-local records remain in
separate keys; lifetime XP and preferences are preserved.

After deploying, complete a Daily and accept the name prompt. Reload and use
Leaderboard to check that your best appears under shared rankings. Beat that
score to check automatic updates without another prompt. Opening
rankings on another browser confirms it came from Supabase rather than local
storage. If the shared section is missing, confirm the build flag and source
commit; if it says unavailable, check the two server variables, SQL execution and
Vercel function logs. Never include keys when sharing logs or screenshots.

## When the public site has not updated
The current implementation branch is `codex/milestone-1-typing-engine`. A push there only updates deployments watching that branch. If production watches `main`, merge the tested branch into `main` on GitHub and check Vercel Deployments for that merge commit. A redeploy of an older deployment rebuilds its old commit. Alternatively, configure Vercel to use the implementation branch as production and deploy its latest commit. Check the deployment source commit before refreshing the site.


## Submission troubleshooting
- The Leaderboard button is always visible. If only local rankings are shown,
  save `VITE_DAILY_LEADERBOARD=true` and build the latest commit again.
- Results now display the actual connection error rather than silently losing
  the token. If that run never connected, reconnect and play a fresh Daily; the
  server cannot verify an offline run retroactively.
- A valid submission can be retried with its original token after a temporary
  error, even after switching modes. Browser storage keeps guest identity, name,
  daily opt-in and last confirmed best/rank; pending run traces stay in memory
  for this visit. Reloading during a failed submission requires a fresh run.
- The API must deploy with JavaScript `.js` import specifiers matching the files
  Vercel emits. The earlier `.ts` source-import fix still crashed after deployment.
  `npm run check:api` compiles the server dependency graph into a temporary directory
  containing only emitted JavaScript/JSON, then checks requests and score replay.
  `npm run build` includes this check automatically. Check Vercel function logs if
  the host returns an HTML error instead of JSON.
- The current SQL from the previous setup still works; this update needs no new
  SQL migration. A live hosted submission must be checked after deployment.


## Recovering from the missing dailyApi.ts error
If logs show `Cannot find module '/var/task/server/dailyApi.ts' imported from
'/var/task/api/daily.js'`, deploy the compiled-import fix. Rebuilding the same old
commit repeats the bug. Merge the fix into the branch Vercel watches and wait for
its new deployment to become Ready. Your existing Supabase SQL and environment
variables remain applicable.

Open `https://h2otype.vercel.app/api/daily` after deploying. With server credentials
configured, a browser GET should return JSON `{"error":"Use POST."}` (HTTP 405),
not a Vercel function crash. The game sends POST requests. Play a fresh Daily in
a private window to test the first-name prompt and submission; failed offline
attempts cannot acquire run tokens retroactively. Confirm ranking and then a
better run's automatic update. A live hosted submission is still required to
validate the actual project credentials.
