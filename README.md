# h2otype

> clicking is apparently the 17th best seated exercise

A focused pixel-arcade typing game with satisfying progression. Built for short timed challenges and endless Zen typing sessions.

## Concept
- **Sprint:** timed 15, 30, or 60 second typing tests, with WPM/accuracy results, base/bonus XP and local personal bests.
- **Zen:** endless uninterrupted typing, cumulative XP and persistent levels.
- **Daily:** the same English-100 passage for everyone each UTC day, with 15-second score challenges and optional shared rankings.
- **Progression:** accurate typing earns XP and levels, with combo vignettes, brief impacts, and prominent nonblocking level announcements.
- **Presentation:** pixel HUD typography, crisp cyan/pink panels, atmospheric dark/light themes, system theme by default, and keyboard-first play.
- **Customizable HUD:** optional live WPM and accuracy, XP progress, and level-up feedback.

## Status
Milestones 0–5 and the current arcade feedback refinements are implemented. Sprint supports 15/30/60-second tests, results, and local personal bests. Zen replenishes continuously, pauses/resumes, and saves a local draft. Correct typing earns persistent XP, animated progression, and a level-up celebration. Fresh correct typing builds a time-decaying combo meter and edge vignette and raises typing-sound pitch. Settings controls appearance, spacing, fonts, graphics, sound/particles, and live-stat sizes. Daily adds fixed-date score challenges and local rankings, with optional shared guest rankings. Completion sounds, combo XP bonuses and clearer results are included. Achievements and unlockable themes are saved for later.

## Development
Use Node.js 20.19+ (20.x) or 22.12+ and npm. Node 24 was used for validation.

```sh
npm ci
npm run dev
```

Vite prints the development server address. For a cloud host, run `npm run dev -- --host 0.0.0.0`.

```sh
npm run build    # TypeScript, compiled API verification, production bundle
npm run check:api # Build and exercise the isolated JavaScript API artifact
npm run lint     # ESLint checks
npm run preview  # Serve the production bundle after building
```

Tests cover pure typing/scoring logic plus browser navigation, themes, storage fallback, keyboard dismissal, mobile layout, typing/correction, deadline/restart, and composition input:

```sh
npx playwright install chromium
npm test
```

If Chromium is already installed, skip the download and use `CHROMIUM_PATH=/usr/bin/chromium npm test` (adjust the path for your machine). On Linux, Playwright may also require system browser libraries; see its installation output.

In this cloud environment the home npm cache is unwritable. Before npm commands, use `export npm_config_cache=/workspace/.cache/npm` and `mkdir -p "$npm_config_cache"`.

## Foundation decisions
- React handles the small interactive controls; TypeScript catches mismatched values before shipping. Vite supplies fast local development and production builds.
- CSS variables define shared colors, surfaces, borders, and shadows. Changing a theme updates those values together. Typing uses built-in font choices; the HUD uses locally bundled Silkscreen Regular ([SIL Open Font License](public/fonts/OFL-Silkscreen.txt)), without a third-party font service.
- Appearance defaults to the device setting, follows changes while open, and saves explicit preferences in localStorage. An early script sets colors before React loads to avoid a bright flash; blocked storage falls back safely to a per-visit choice.
- A native Settings dialog provides keyboard focus handling and Escape dismissal. Closing it returns focus to active typing or the current summary. F2 opens Settings directly; its controls retain visible focus styles. The layout adapts to narrow screens, and reduced-motion preferences disable transitions.
- A real browser text field shows only the active word; Space clears it for the next word while the passage retains correct/error feedback and the current caret. Backspace from an empty field reopens the previous word; pasting, dropping text, mid-passage edits, and held character keys are blocked. Composition drafts are scored only when committed.
- Timing uses a monotonic clock and an absolute deadline rather than counting interval callbacks, so delayed callbacks do not extend a test. Sprint keeps running through focus changes and Settings; switching away discards the Sprint run. Zen pauses when the tab is hidden and saves a paused draft immediately when switching to Sprint.
- Gameplay rules live in pure functions, separate from React, so timing and scoring can be tested directly. Progression stays local to this browser; no backend or account system is required.

## Trying the typing engine
Choose Sprint or Zen and start typing the passage. A ready session focuses the input automatically; the first committed character starts time, so simply focusing never starts the clock. Typing after clicking elsewhere on the game page also returns to the real input without losing the first character. Correct characters darken; mistakes are colored and underlined. Press Space after each word to clear the field and continue. Backspace to fix mistakes, including returning to the previous word from an empty input. The workspace is centered on screen without promotional copy or feature cards. The passage scrolls to keep the caret visible on small screens. The passage caret shows typing focus without a large outline around the workspace or input.

Choose 15s (default), 30s, or 60s for Sprint. Changing duration discards the current run and focuses a fresh input. The selected duration stays active across restarts, word-set changes, and mode switches for this visit. Generated runs contain 600 words, with a fresh sequence on restart; reaching the end early also finishes the run. Zen has no time limit or passage boundary: new batches are appended ahead of the caret as you type.

At the end of Sprint, the passage is replaced by results showing WPM, accuracy, incorrect attempts, elapsed time, and the personal best for that duration. Press Enter while the results heading is focused, or click Restart, to reset and focus the input. Restart during practice also clears the run, clock, and counts. Live WPM and accuracy are off by default and can be enabled independently in Settings.

**Quick restart:** press Tab anywhere on the game page, including after clicking a header control or outside the typing field. It starts a fresh Sprint with the same duration, or clears the current Zen draft for a new session, and focuses typing. Earned lifetime XP and personal bests stay saved. Shift+Tab keeps/returns focus to typing without clearing the run; it does not navigate page controls. Press F2 to open Settings, where Tab and Shift+Tab navigate normally and cannot restart the session. Held Tab repeats and active composition cannot restart or navigate; Ctrl/Alt/Meta shortcuts retain their browser/OS behavior. Paused Zen and Sprint results still require Resume/Enter or a fresh restart before typing continues.

Personal bests are saved separately per duration and word set in this browser's localStorage. Original sentence records retain `h2otype.sprint-bests.v1`; generated sets use `h2otype.sprint-bests.<wordSet>.v1`. Higher WPM wins; equal WPM uses higher accuracy as the tie-breaker. Only full-duration runs with at least one correct character qualify. Restarting/changing mode or duration does not save a partial run. Corrupt records are ignored, and unavailable/full browser storage shows a message without breaking results or restart. Records are local to this browser and origin; they are not online accounts or leaderboards.

Scoring conventions:
- WPM = correctly retained characters ÷ 5 ÷ elapsed minutes, rounded to a whole number. Spaces and punctuation count. Zero elapsed time gives 0 WPM.
- Accuracy = correct character attempts ÷ all character attempts, rounded to a percentage. Backspace does not erase previous mistakes; retyping is another attempt. An untouched session defaults to 100% accuracy.
- The incorrect-attempt count includes corrected mistakes. XP uses a separate first-correct-position ledger, so repeated corrections cannot earn more XP for the same position.

## Word sets
Click the word-set button beside Settings, or press **F3**, to choose **English 100**, **English 500**, **English 1,000**, or the original **English sentences**. English 100 is the default for new visits. The larger sets add variety; all words are bundled locally, so play needs no word service. These are curated common-word pools, not exact frequency rankings. Attribution is in [src/data/WORDS.md](src/data/WORDS.md).

Changing sets starts a fresh run and clears any saved Zen draft in either mode. Earned XP, personal bests, selected Sprint duration, and display settings stay intact. Closing without changing, or choosing the same set, preserves your run. Your choice is remembered in `h2otype.word-set.v1`; when restoring an existing Zen draft, its original set wins so its text stays unchanged. Old sentence drafts still resume correctly. Other languages can be added later.

Zen saves the generator's place with the draft, like a bookmark for future words. Resuming keeps both the existing passage and its continuation; it does not silently reshuffle. New sessions and Tab restart get fresh words.

## Zen sessions
Zen starts time on the first committed character. Press Escape in the input or click Pause to stop active time and view WPM, accuracy, incorrect attempts, and correctly retained characters. Resume (or Enter from the focused summary heading) continues the same session and refocuses input. Finish shows the summary without deleting progress; New session explicitly clears it. Clicking the top Sprint button switches directly and saves the paused Zen draft. Return to Zen and Resume to continue; time spent in Sprint does not count toward Zen.

Zen automatically pauses when the page becomes hidden. Settings and ordinary input blur do not pause it. Session time counts only active periods; reloads, paused time, and time away never inflate the denominator. Live WPM and accuracy are off by default and can be enabled independently in Settings.

One resumable draft is stored with lifetime XP in `h2otype.progress.v1`. Each edit saves its text, credit history, and total XP together in one write; periodic saves every five seconds also capture active elapsed time, with additional saves on pause/finish, leaving Zen, page hide, and unmount. Reloaded sessions open paused when you select Zen. A hard crash can lose up to the last five seconds of active elapsed time. New session clears the saved draft while retaining lifetime XP. Progress is intended for one active tab; tabs share one local profile and the last save wins. Corrupt saves are ignored; read/write failures show a message and play continues in memory.

To keep long sessions responsive, Zen appends short local text batches and retires older history. At least the last 200 characters remain available for Backspace correction; older characters are finalized into session totals. Attempts and errors remain cumulative across batches and reloads. Generated word pools replenish continuously; the original sentence collection cycles. XP credit follows the same character positions through retirement and resume without being awarded again.

## XP and levels
- Each character position earns **1 base XP the first time it is typed correctly in a session**, including spaces and punctuation. Correcting a mistake can earn that position's first XP. Deleting and retyping a credited character does not earn more.
- Combo tiers at 25/60/120/200/350 add **20/50/100/150/200%** to newly earned XP. Fractional bonuses carry forward: 100 perfect characters earn 100 base + 27 bonus XP. Highest combo and base/bonus XP appear in results. Existing drafts/balances migrate without retroactive bonuses.
- Combo charge drains steadily while active, faster at higher tiers (0.75/1.5/2.5/4/6/8 units per second). Fresh correct positions replenish it; the current tier sets future bonuses and sound pitch. Decay preserves earned XP and historical best.
- Held character-key repeats, incorrect attempts, paste/drop, uncommitted composition, paused input, and post-deadline input do not award XP. There are no separate speed/accuracy bonuses.
- Earned XP stays earned after Backspace, restart, mode changes, or abandoning a run. Restarting or opening results does not grant XP. Fresh correct typing in a new session is legitimate practice and can earn XP again.
- Level 1 starts at 0 XP. Reaching level 2 costs 100 XP; the next level costs 200 more, then 300 more. Lifetime thresholds for levels 2/3/4/5 are 100/300/600/1000 XP. Levels are calculated from total XP.
- The wide XP rail above the passage shows level, current/required XP, lifetime XP, and the next level. Its fill accelerates then slows toward earned XP, rolling over naturally between levels. The labels and accessible progressbar stay exact during that animation. A prominent four-second level-up banner never moves keyboard focus. Sprint results and Zen summaries show XP earned in that session.
- Lifetime XP and the current Zen credit history share one versioned `h2otype.progress.v1` storage value, so a reload cannot pay again from an older saved draft. Milestone 3 drafts from `h2otype.zen-session.v1` migrate automatically without retroactive XP; existing correct positions are marked credited. Sprint personal bests and appearance settings remain intact.
- If storage fails, play and XP continue in memory and the XP area says **XP not saved**. Closing/reloading can lose unsaved progress. Malformed saved data is ignored. Progress is local to this browser/origin, with no cloud sync; use one active tab to avoid concurrent writes overwriting each other.

## Daily challenges
Choose **Daily** at the top. Everyone gets the same English-100 passage and a
15-second timer for that UTC date. First typing starts the clock. Restart repeats
the same passage; after midnight UTC, restarting loads the new day. Daily keeps
your Sprint word-set/duration preferences and saved Zen session intact.

Every first-correct character earns 10 points, plus 2/5/10/15/20 bonus points at the five combo tiers. Mistakes
break the combo; idle time drains it faster at higher tiers, and deleting/retyping cannot pay again. Results show points, WPM,
accuracy, highest combo, and XP. **Daily rankings** sorts by score, then accuracy,
then WPM. Local attempts are labelled **Scores on this browser**, with ten best
attempts per day for thirty days. Only full-duration tests with correct text
qualify. Daily scores stay separate from Sprint speed records.

The optional shared guest leaderboard needs a database connection. Its server
replays the run and calculates points itself. The **Leaderboard** button beneath
the logo opens rankings in any mode, before playing. Your first qualifying online
Daily score prompts for a public display name and permission to keep your entry
updated for that UTC day. Better runs then submit automatically; slower/equal
runs do not. The name and daily permission survive reloads, and midnight asks
again. Your saved rank appears beside Leaderboard; the dialog also shows your
exact standing outside the top 50. Not now dismisses without publishing.

Submissions keep their original run even if you restart or switch modes. Failed
submissions show a retry action, while a test that never connected requires a
fresh run after reconnecting. Local scores stay available throughout. The server
keeps only your best submitted entry per guest and day. See [DEPLOYMENT.md](DEPLOYMENT.md)
for step-by-step Vercel/Cloudflare publishing and Supabase configuration (no player accounts required). Daily rules version 4 keeps decay-based rankings separate from older scores. Without that setup,
the static game and local Daily rankings still work normally.

## Settings
Open **Settings** in the header or press **F2**. Changes take effect immediately in both Sprint and Zen without clearing the session:

| Preference | Default | Behavior |
| --- | --- | --- |
| Live WPM | Off | Shows current speed using the existing correct-character/active-time calculation. |
| WPM refresh rate | 0.5 seconds | Choose Instant, 0.5 seconds, 1 second, or 2 seconds between live WPM updates. Slower choices hold the number steady between active-time intervals; final results and scoring remain exact. |
| Typing font | 8-bit | Choose bundled 8-bit, Monospace, System, or Serif. Applies to the passage and word input. |
| Font weight | Regular | Choose Regular, Medium, Semibold, or Bold with the slider. |
| Typing size | 100% | Scale the passage, input, and workspace from 80% to 130%; layout stays within the viewport. |
| Scroll speed | 120ms | Smooth-to-Instant slider controlling how quickly a completed line scrolls away. The current line moves to the top, with four lines visible in normal windows. Short windows use fewer lines so controls still fit. |
| Caret speed | 70ms | Smooth-to-Instant slider controlling horizontal caret movement; line wraps jump directly to the next line. Reduced motion makes scrolling and caret movement instant. |
| Finish confetti | 150% | Off–200% amount slider, subject to graphics quality, effects intensity and reduced motion. |
| Character spacing | 0px | Add 0–3px between characters in 0.5px steps, applying to the passage and word input. |
| WPM size | 100% | Scale the live WPM label and number from 80% to 200%, independently of the typing text. |
| Accuracy size | 100% | Scale live accuracy from 80% to 200%, independently of WPM. |
| Typing sound | 8-bit crush | Standard click or 8-bit crush, with Preview sound and a separate volume slider. Accepted character edits play once; controls and Backspace stay silent. |
| Sound volume | 35% | Adjust from 0% (mute) to 100%. Sounds are generated locally, with at most four simultaneous short voices and no queued backlog. |
| Typing particles | 8-bit pixels | Regular circles or 8-bit pixels burst from correct characters. Wrong characters and Backspace stay quiet visually; reduced motion suppresses particles. |
| Graphics quality | High | Three-stop slider: Low uses fewer particles, a static vignette, no shake/glow, and instant XP. High adds denser bursts, richer glow, and longer XP easing. Reduced motion overrides visual animation at every tier. |
| Visual effects | Intense | Off/Balanced/Intense slider, separate from quality. Intense strengthens the edge vignette and combo shake. Off keeps plain meters/notices and disables decorative effects and XP motion. |
| Screen shake | On | Brief, bounded impacts at combo milestones. Can be turned off independently; Low quality, Effects Off, and reduced motion suppress it. |
| Combo feedback | On | Consecutive fresh correct characters build a combo meter and edge vignette and progressively higher sound pitch. Turn off for quieter visuals and fixed pitch. Bonus XP remains active when visual feedback is hidden. |
| Live accuracy | Off | Shows correct attempts divided by all attempts, including corrected mistakes. |
| XP progress | On | Shows the wide level/XP rail above typing; hiding it keeps XP accruing and leaves session XP in results. |
| Level-up notifications | On | Shows brief, nonblocking notices; turning it off dismisses an active notice and suppresses new ones. |
| Appearance | System | System/light/dark themes; System follows device changes. |

Display preferences are stored in `h2otype.preferences.v1`; existing appearance remains in `h2otype.theme`. These keys are separate from XP, Zen sessions, and personal bests. Invalid fields fall back to defaults. Storage failures keep the choices working for the visit and show an explanation in Settings. Display preferences also follow changes made in another tab.

Appearance, size, weight, volume, and WPM refresh use labeled native controls. The WPM slider retains the same four intervals as the original dropdown. Changes apply without restarting a run. Correct-letter particles follow the passage after scrolling and font/size changes; they are short-lived and clear on restart or pause. Sound and particles do not change XP or scoring. Some browsers require a user gesture before audio can play; use Preview sound if needed. Audio failures show a status in Settings while typing continues normally.

Particles start just beyond the letter's right edge and fan out through a right-facing 180° semicircle. Graphics tiers change particle count, lifetime, frame/resolution caps, and decoration without changing gameplay. The stronger 8-bit crunch has a sharper attack and fuller body; use volume or Off to suit your preference. The pixel HUD follows the supplied arcade references; the screen-wide scanline/filter overlay is removed. Passage fonts and existing local data remain configurable.

Pixel particles are larger 6×6 sprites with fewer per burst (2/4/6 for Low/Medium/High) and lower caps (12/24/36) to keep the passage readable. Crunch has a stronger 95ms low-end hit. Level-ups now add a larger banner above the passage, an expanding ring, and a short pixel burst; Low/reduced motion keep a static banner, and notification Off hides the whole celebration.

Level announcements scale up quickly (320ms), hold, then shrink over the same 320ms interval before disappearing at four seconds. Visual effects default to Intense: an earned screen-edge vignette grows with combos, while the center stays transparent and flame sprites are removed. Shake pulses only at combo tier gains, lasts 220ms, and grows to 7.5px (8px hard cap). Balanced reduces vignette opacity and uses 160ms/0.8px pulses. Only one shake animation runs at a time. Sound/particle choices stay independent. Choose Balanced, Off, or disable Screen shake in Settings; Low/reduced motion keep gameplay still.

Combos begin at **25 fresh correct characters**, then reach higher tiers at 60, 120, 200, and 350. The footer becomes a combo meter with a progressively stronger edge vignette, while the selected sound rises in pitch up to seven semitones. Sound Off stays silent. Errors, Backspace, pause/finish, hiding the page, restart, mode changes, and reload break a streak; correcting an already credited position cannot farm it. Settings and idle time alone do not break it. Combos now award **up to 3× XP** on fresh correct positions and increase Daily points. WPM and accuracy formulas stay unchanged. Low/reduced motion keep the vignette static; disabling Combo feedback hides the meter and pitch escalation without changing rewards.

Finishing Sprint/Daily or explicitly finishing a nonempty Zen session plays a short rising phrase matching the selected sound. Sound Off and volume apply; Pause, restored summaries and opening Settings do not replay it. Restart, mute, hiding and mode changes cancel audio.

Keyboard users can Tab/Shift+Tab through the modal, use Space on switches, arrow keys on theme radios, and Escape to close. The panel scrolls on small screens while Close stays accessible. Live stats are not an announcing live region, so they do not read out every keystroke. Reduced-motion preferences disable caret blinking and transitions. Controls have larger hit areas, and the workspace stays centered with optional stats enabled.

## Stack
React + TypeScript + Vite. For the initial version, use localStorage rather than accounts or a backend.

## Project documents
- [DEPLOYMENT.md](DEPLOYMENT.md): public playtest hosting and optional shared Daily rankings.
- [NOTES.md](NOTES.md): user feedback and the wishlist for future improvements.
- [DESIGN.md](DESIGN.md): product and visual specification.
- [ROADMAP.md](ROADMAP.md): staged implementation milestones.
- [PROGRESS.md](PROGRESS.md): current development state and handoff notes.
- [AGENTS.md](AGENTS.md): persistent instructions for Codex.

## Starting work with Codex
1. Open this GitHub repository in Codex.
2. Ask Codex to read README.md, DESIGN.md, ROADMAP.md, PROGRESS.md and AGENTS.md.
3. All MVP milestones are complete. Choose a specific bug fix, refinement, or release/deployment task and request tested changes with a PROGRESS.md update.

Keep changes small and review them before merging.

## Finish celebrations and harder combos
Completed Sprint/Daily tests and nonempty Zen Finish trigger one short confetti burst around the full screen perimeter, mainly along the sides with smaller top/bottom sprays. Combo tier upgrades emit light pixel bursts from the vignette edges; ordinary keystrokes do not. Effects stay away from the central passage and never capture clicks or focus. Confetti lasts 2.2 seconds; combo bursts last 750ms. At 100% confetti, Medium budgets 100 finish/12 combo pieces and High 160/20. Finish confetti defaults to 150% (240 pieces on High), adjusts from Off to 200%, and Balanced halves the counts. Low, Effects Off, and reduced motion disable these moving decorations. Restart, hiding the page, resize and relevant setting changes clear them; restored summaries and Pause do not celebrate.

The larger combo rewards apply only to newly credited positions. Existing lifetime XP and saved Zen rewards keep their value. Daily uses scoring rules version 4 and `h2otype.daily-scores.v4`; older local rankings remain stored separately, while new shared rankings filter by rules version. WPM personal bests and accuracy calculations are unchanged.

## Reading flow and new-player defaults
New visits start in Sprint 15s, with High graphics, Screen shake on, and 8-bit sound and particles enabled. Every saved returning-player setting is preserved. Pixel typography is consistent across menus, descriptions, statistics and results; the typing font remains selectable and saved.

The passage keeps its active line at the top as soon as the preceding line is complete. In normal windows this gives four upcoming/current lines instead of waiting for the caret to fall below the bottom. Scroll/caret speed sliders control visual motion only; neither delays accepted input or scoring. Restart resets the passage immediately. Font changes, resizing, Zen retirement and reduced motion keep the caret aligned.

Medium and High particles now draw on each available display animation frame instead of skipping frames around a fixed cap. Larger pixel sprites move continuously rather than snapping to a two-pixel grid. Low retains a 30fps limit. Actual performance still depends on the device and browser.

Daily is a shared-date 15s Sprint for now. Its score storage and optional server tokens use rules version 4, keeping earlier 60s and nondecaying 15s scores separate. Per-duration Daily passages, multiplayer racing, unlockable carets, currency and randomized pets are future plans in NOTES.md.

## Caret visibility and today's Daily
The caret blinks only before a run starts. Once typing begins, it stays solid even after deleting all text, pausing/resuming Zen, or opening Settings. Restarting/new sessions restore the initial blink; reduced motion keeps it still from the start.

A compact button beneath the logo shows **Daily available**, then **Daily best · score** after an eligible completion. It opens Daily directly and shows the highest score for the current UTC day, updating after each finish, reload and changes in another tab. Midnight offers the next challenge; finishing a pinned previous-day run does not become today's best. Scores are local to this browser. If saving fails, the best seen during the visit still stays visible; it cannot survive a reload without working storage.

Finish confetti now uses 2.5× the previous particle budget, larger pieces, a wider spread and a longer 2.2-second fall: Medium 100/High 160 pieces at 100%, up to 320 at 200%. Saved amount, Off/Balanced/Intense, graphics and reduced-motion choices remain effective. Shared guest rankings are implemented through Supabase; activation needs the hosting configuration in DEPLOYMENT.md.
