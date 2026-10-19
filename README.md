# h2otype

> clicking is apparently the 17th best seated exercise

A focused pixel-arcade typing game with satisfying progression. Built for short timed challenges and endless Zen typing sessions.

## Concept
- **Sprint:** timed 15, 30, or 60 second typing tests, with WPM/accuracy results and local personal bests.
- **Zen:** endless uninterrupted typing, cumulative XP and persistent levels.
- **Progression:** accurate typing earns XP and eventually unlocks levels; restrained, nonblocking feedback.
- **Presentation:** pixel HUD typography, crisp cyan/pink panels, atmospheric dark/light themes, system theme by default, and keyboard-first play.
- **Customizable HUD:** optional live WPM and accuracy, XP progress, and level-up feedback.

## Status
Milestones 0–5 and the current arcade feedback refinements are implemented. Sprint supports 15/30/60-second tests, results, and local personal bests. Zen replenishes continuously, pauses/resumes, and saves a local draft. Correct typing earns persistent XP, animated progression, and a level-up celebration. Streaks build a fiery combo meter and raise typing-sound pitch. Settings controls appearance, spacing, fonts, graphics, sound/particles, and live-stat sizes. Achievements and unlockable themes are saved for later.

## Development
Use Node.js 20.19+ (20.x) or 22.12+ and npm. Node 24 was used for validation.

```sh
npm ci
npm run dev
```

Vite prints the development server address. For a cloud host, run `npm run dev -- --host 0.0.0.0`.

```sh
npm run build    # TypeScript checks and production bundle
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
- Timing uses a monotonic clock and an absolute deadline rather than counting interval callbacks, so delayed callbacks do not extend a test. Sprint keeps running through focus changes and Settings; switching away discards the Sprint run. Zen pauses when the tab is hidden and offers a summary before switching to Sprint, preserving a resumable session.
- Gameplay rules live in pure functions, separate from React, so timing and scoring can be tested directly. Progression stays local to this browser; no backend or account system is required.

## Trying the typing engine
Choose Sprint or Zen and start typing the passage. A ready session focuses the input automatically; the first committed character starts time, so simply focusing never starts the clock. Typing after clicking elsewhere on the game page also returns to the real input without losing the first character. Correct characters darken; mistakes are colored and underlined. Press Space after each word to clear the field and continue. Backspace to fix mistakes, including returning to the previous word from an empty input. The workspace is centered on screen without promotional copy or feature cards. The passage scrolls to keep the caret visible on small screens. The passage caret shows typing focus without a large outline around the workspace or input.

Choose 15s, 30s (default), or 60s for Sprint. Changing duration discards the current run and focuses a fresh input. The selected duration stays active across restarts and mode switches for this visit. A long fixed passage supplies enough text for normal timed runs; reaching its end early also finishes the run. Zen has no time limit or passage boundary: new batches are appended ahead of the caret as you type.

At the end of Sprint, the passage is replaced by results showing WPM, accuracy, incorrect attempts, elapsed time, and the personal best for that duration. Press Enter while the results heading is focused, or click Restart, to reset and focus the input. Restart during practice also clears the run, clock, and counts. Live WPM and accuracy are off by default and can be enabled independently in Settings.

**Quick restart:** press Tab anywhere on the game page, including after clicking a header control or outside the typing field. It starts a fresh Sprint with the same duration, or clears the current Zen draft for a new session, and focuses typing. Earned lifetime XP and personal bests stay saved. Shift+Tab keeps/returns focus to typing without clearing the run; it does not navigate page controls. Press F2 to open Settings, where Tab and Shift+Tab navigate normally and cannot restart the session. Held Tab repeats and active composition cannot restart or navigate; Ctrl/Alt/Meta shortcuts retain their browser/OS behavior. Paused Zen and Sprint results still require Resume/Enter or a fresh restart before typing continues.

Personal bests are saved per duration in this browser's localStorage (`h2otype.sprint-bests.v1`). Higher WPM wins; equal WPM uses higher accuracy as the tie-breaker. Only full-duration runs with at least one correct character qualify. Restarting/changing mode or duration does not save a partial run. Corrupt records are ignored, and unavailable/full browser storage shows a message without breaking results or restart. Records are local to this browser and origin; they are not online accounts or leaderboards.

Scoring conventions:
- WPM = correctly retained characters ÷ 5 ÷ elapsed minutes, rounded to a whole number. Spaces and punctuation count. Zero elapsed time gives 0 WPM.
- Accuracy = correct character attempts ÷ all character attempts, rounded to a percentage. Backspace does not erase previous mistakes; retyping is another attempt. An untouched session defaults to 100% accuracy.
- The incorrect-attempt count includes corrected mistakes. XP uses a separate first-correct-position ledger, so repeated corrections cannot earn more XP for the same position.

## Zen sessions
Zen starts time on the first committed character. Press Escape in the input or click Pause to stop active time and view WPM, accuracy, incorrect attempts, and correctly retained characters. Resume (or Enter from the focused summary heading) continues the same session and refocuses input. Finish shows the summary without deleting progress; New session explicitly clears it. Clicking Sprint offers the summary with Go to Sprint or Resume.

Zen automatically pauses when the page becomes hidden. Settings and ordinary input blur do not pause it. Session time counts only active periods; reloads, paused time, and time away never inflate the denominator. Live WPM and accuracy are off by default and can be enabled independently in Settings.

One resumable draft is stored with lifetime XP in `h2otype.progress.v1`. Each edit saves its text, credit history, and total XP together in one write; periodic saves every five seconds also capture active elapsed time, with additional saves on pause/finish, leaving Zen, page hide, and unmount. Reloaded sessions open paused when you select Zen. A hard crash can lose up to the last five seconds of active elapsed time. New session clears the saved draft while retaining lifetime XP. Progress is intended for one active tab; tabs share one local profile and the last save wins. Corrupt saves are ignored; read/write failures show a message and play continues in memory.

To keep long sessions responsive, Zen appends short local text batches and retires older history. At least the last 200 characters remain available for Backspace correction; older characters are finalized into session totals. Attempts and errors remain cumulative across batches and reloads. The current local text collection cycles; varied/generated content can be expanded later. XP credit follows the same character positions through retirement and resume without being awarded again.

## XP and levels
- Each character position earns **1 XP the first time it is typed correctly in a session**, including spaces and punctuation. Correcting a mistake can earn that position's first XP. Deleting and retyping a credited character does not earn more.
- Held character-key repeats, incorrect attempts, paste/drop, uncommitted composition, paused input, and post-deadline input do not award XP. There are no speed/accuracy bonuses yet.
- Earned XP stays earned after Backspace, restart, mode changes, or abandoning a run. Restarting or opening results does not grant XP. Fresh correct typing in a new session is legitimate practice and can earn XP again.
- Level 1 starts at 0 XP. Reaching level 2 costs 100 XP; the next level costs 200 more, then 300 more. Lifetime thresholds for levels 2/3/4/5 are 100/300/600/1000 XP. Levels are calculated from total XP.
- The wide XP rail above the passage shows level, current/required XP, lifetime XP, and the next level. Its fill accelerates then slows toward earned XP, rolling over naturally between levels. The labels and accessible progressbar stay exact during that animation. A prominent four-second level-up banner never moves keyboard focus. Sprint results and Zen summaries show XP earned in that session.
- Lifetime XP and the current Zen credit history share one versioned `h2otype.progress.v1` storage value, so a reload cannot pay again from an older saved draft. Milestone 3 drafts from `h2otype.zen-session.v1` migrate automatically without retroactive XP; existing correct positions are marked credited. Sprint personal bests and appearance settings remain intact.
- If storage fails, play and XP continue in memory and the XP area says **XP not saved**. Closing/reloading can lose unsaved progress. Malformed saved data is ignored. Progress is local to this browser/origin, with no cloud sync; use one active tab to avoid concurrent writes overwriting each other.

## Settings
Open **Settings** in the header or press **F2**. Changes take effect immediately in both Sprint and Zen without clearing the session:

| Preference | Default | Behavior |
| --- | --- | --- |
| Live WPM | Off | Shows current speed using the existing correct-character/active-time calculation. |
| WPM refresh rate | 0.5 seconds | Choose Instant, 0.5 seconds, 1 second, or 2 seconds between live WPM updates. Slower choices hold the number steady between active-time intervals; final results and scoring remain exact. |
| Typing font | Monospace | Choose Monospace, System, or Serif using built-in fonts. Applies to the passage and word input. |
| Font weight | Regular | Choose Regular, Medium, Semibold, or Bold with the slider. |
| Typing size | 100% | Scale the passage, input, and workspace from 80% to 130%; layout stays within the viewport. |
| Character spacing | 0px | Add 0–3px between characters in 0.5px steps, applying to the passage and word input. |
| WPM size | 100% | Scale the live WPM label and number from 80% to 200%, independently of the typing text. |
| Accuracy size | 100% | Scale live accuracy from 80% to 200%, independently of WPM. |
| Typing sound | Off | Standard click or 8-bit crush, with Preview sound and a separate volume slider. Accepted character edits play once; controls and Backspace stay silent. |
| Sound volume | 35% | Adjust from 0% (mute) to 100%. Sounds are generated locally, with at most four simultaneous short voices and no queued backlog. |
| Typing particles | Off | Regular circles or 8-bit pixels burst from correct characters. Wrong characters and Backspace stay quiet visually; reduced motion suppresses particles. |
| Graphics quality | Medium | Three-stop slider: Low uses fewer particles and removes scanlines/glow and XP motion. High adds denser bursts, richer glow, and longer XP easing. Reduced motion overrides visual animation at every tier. |
| Combo feedback | On | Consecutive fresh correct characters build a fire meter and progressively higher sound pitch. Turn off for quieter visuals and fixed pitch. No XP multiplier. |
| Live accuracy | Off | Shows correct attempts divided by all attempts, including corrected mistakes. |
| XP progress | On | Shows the wide level/XP rail above typing; hiding it keeps XP accruing and leaves session XP in results. |
| Level-up notifications | On | Shows brief, nonblocking notices; turning it off dismisses an active notice and suppresses new ones. |
| Appearance | System | System/light/dark themes; System follows device changes. |

Display preferences are stored in `h2otype.preferences.v1`; existing appearance remains in `h2otype.theme`. These keys are separate from XP, Zen sessions, and personal bests. Invalid fields fall back to defaults. Storage failures keep the choices working for the visit and show an explanation in Settings. Display preferences also follow changes made in another tab.

Appearance, size, weight, volume, and WPM refresh use labeled native controls. The WPM slider retains the same four intervals as the original dropdown. Changes apply without restarting a run. Correct-letter particles follow the passage after scrolling and font/size changes; they are short-lived and clear on restart or pause. Sound and particles do not change XP or scoring. Some browsers require a user gesture before audio can play; use Preview sound if needed. Audio failures show a status in Settings while typing continues normally.

Particles start just beyond the letter's right edge and fan out through a right-facing 180° semicircle. Graphics tiers change particle count, lifetime, frame/resolution caps, and decoration without changing gameplay. The stronger 8-bit crunch has a sharper attack and fuller body; use volume or Off to suit your preference. The optional scanlines and pixel HUD follow the supplied arcade references; passage fonts and all existing local data remain configurable.

Pixel particles are larger 6×6 sprites with fewer per burst (2/4/6 for Low/Medium/High) and lower caps (12/24/36) to keep the passage readable. Crunch has a stronger 95ms low-end hit. Level-ups now add a larger banner above the passage, an expanding ring, and a short pixel burst; Low/reduced motion keep a static banner, and notification Off hides the whole celebration.

Combos begin at **10 fresh correct characters**, then reach higher tiers at 25, 50, 100, and 200. The footer becomes a combo meter with progressively stronger fire, while the selected sound rises in pitch up to seven semitones. Sound Off stays silent. Errors, Backspace, pause/finish, hiding the page, restart, mode changes, and reload break a streak; correcting an already credited position cannot farm it. Settings and idle time alone do not break it. Combos change feedback only: **XP, WPM, accuracy, and final scores retain their existing rules**. Low/reduced motion keep the fire static; disabling Combo feedback clears the meter and pitch escalation.

Keyboard users can Tab/Shift+Tab through the modal, use Space on switches, arrow keys on theme radios, and Escape to close. The panel scrolls on small screens while Close stays accessible. Live stats are not an announcing live region, so they do not read out every keystroke. Reduced-motion preferences disable caret blinking and transitions. Controls have larger hit areas, and the workspace stays centered with optional stats enabled.

## Stack
React + TypeScript + Vite. For the initial version, use localStorage rather than accounts or a backend.

## Project documents
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
