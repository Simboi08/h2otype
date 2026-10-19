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
   from Supabase's API settings. Keep these on the server; never give the key a
   `VITE_` prefix, paste it into source files, or share it in chat.
3. Set the public build flag `VITE_DAILY_LEADERBOARD=true`. Redeploy so Vite
   includes the shared rankings interface. Cloudflare Pages also needs the two
   private values available to its Functions runtime.
4. Complete Daily, open Daily rankings, enter a display name and choose
   **Submit score**. A successful submission appears on the guest leaderboard.
   Keep the flag false/unset if you only want the static game.

The server issues a run token, checks its age (58 seconds to ten minutes,
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

Supabase preparation is complete; create the project when you are ready to enable
shared rankings. This environment has no project credentials, so live provisioning
and a real hosted submission have not been tested. API behavior is tested
with an isolated database adapter; the SQL migration is also exercised with a
PostgreSQL-compatible local engine. Configure the hosting values above to turn
on shared rankings.
