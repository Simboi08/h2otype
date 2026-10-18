# h2otype

> clicking is apparently the 17th best seated exercise

A minimalist, Apple-inspired typing game with a calm interface and satisfying progression. Built for short timed challenges and endless Zen typing sessions.

## Concept
- **Sprint:** timed 15, 30, or 60 second typing tests, with WPM/accuracy results and local personal bests.
- **Zen:** endless uninterrupted typing, cumulative XP and persistent levels.
- **Progression:** accurate typing earns XP and eventually unlocks levels; restrained, nonblocking feedback.
- **Presentation:** Cupertino-inspired light/dark themes, system theme by default, clean typography and keyboard-first controls.
- **Customizable HUD:** optional live WPM and accuracy, XP progress, and level-up feedback.

## Status
Milestones 0–5 are implemented: a React + TypeScript + Vite foundation, persistent light/dark/system appearance, and a working typing engine with character feedback, caret, timer, correction, and restart. Sprint supports 15/30/60-second tests, a results screen, and local personal bests for each duration. Zen now replenishes text continuously, supports pause/resume and a session summary, and saves a resumable session locally. Correct typing now earns persistent XP and levels, with a small header indicator and nonblocking level-up feedback. Settings now includes persistent live-statistics, XP-display, and notification preferences. The planned MVP milestones are complete.

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
- CSS variables define shared colors, surfaces, borders, and shadows. Changing a theme updates those values together. System fonts avoid external font downloads.
- Appearance defaults to the device setting, follows changes while open, and saves explicit preferences in localStorage. An early script sets colors before React loads to avoid a bright flash; blocked storage falls back safely to a per-visit choice.
- A native Settings dialog provides keyboard focus handling and Escape dismissal. Pointer-opening from a typing field returns focus to that field when possible; keyboard-opening returns to the Settings button. Controls have visible focus styles, the layout adapts to narrow screens, and reduced-motion preferences disable transitions.
- A real browser text field shows only the active word; Space clears it for the next word while the passage retains correct/error feedback and the current caret. Backspace from an empty field reopens the previous word; pasting, dropping text, mid-passage edits, and held character keys are blocked. Composition drafts are scored only when committed.
- Timing uses a monotonic clock and an absolute deadline rather than counting interval callbacks, so delayed callbacks do not extend a test. Sprint keeps running through focus changes and Settings; switching away discards the Sprint run. Zen pauses when the tab is hidden and offers a summary before switching to Sprint, preserving a resumable session.
- Gameplay rules live in pure functions, separate from React, so timing and scoring can be tested directly. Progression stays local to this browser; no backend or account system is required.

## Trying the typing engine
Choose Sprint or Zen, click the typing field (or reach it with Tab), and type the passage above it. The first committed character starts time. Correct characters darken; mistakes are colored and underlined. Press Space after each word to clear the field and continue. Backspace to fix mistakes, including returning to the previous word from an empty input. The workspace is centered on screen without promotional copy or feature cards. The passage scrolls to keep the caret visible on small screens.

Choose 15s, 30s (default), or 60s for Sprint. Changing duration discards the current run and focuses a fresh input. The selected duration stays active across restarts and mode switches for this visit. A long fixed passage supplies enough text for normal timed runs; reaching its end early also finishes the run. Zen has no time limit or passage boundary: new batches are appended ahead of the caret as you type.

At the end of Sprint, the passage is replaced by results showing WPM, accuracy, incorrect attempts, elapsed time, and the personal best for that duration. Press Enter while the results heading is focused, or click Restart, to reset and focus the input. Restart during practice also clears the run, clock, and counts. Live WPM and accuracy are off by default and can be enabled independently in Settings.

**Quick restart:** press Tab in the typing field or from the focused results/summary heading. It starts a fresh Sprint with the same duration, or clears the current Zen draft for a new session. Earned lifetime XP and personal bests stay saved. Shift+Tab leaves the field for keyboard navigation; Tab works normally on other controls and inside Settings. Held Tab repeats and active composition do not restart the session.

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
- The small indicator below the wordmark shows level and progress toward the next level. Hover for exact XP; its accessible progressbar exposes the same information. A four-second level-up notice never moves keyboard focus. Sprint results and Zen summaries show XP earned in that session.
- Lifetime XP and the current Zen credit history share one versioned `h2otype.progress.v1` storage value, so a reload cannot pay again from an older saved draft. Milestone 3 drafts from `h2otype.zen-session.v1` migrate automatically without retroactive XP; existing correct positions are marked credited. Sprint personal bests and appearance settings remain intact.
- If storage fails, play and XP continue in memory and the header says **XP not saved**. Closing/reloading can lose unsaved progress. Malformed saved data is ignored. Progress is local to this browser/origin, with no cloud sync; use one active tab to avoid concurrent writes overwriting each other.

## Settings
Open **Settings** in the header. Changes take effect immediately in both Sprint and Zen without clearing the session:

| Preference | Default | Behavior |
| --- | --- | --- |
| Live WPM | Off | Shows current speed using the existing correct-character/active-time calculation. |
| WPM refresh rate | 0.5 seconds | Choose Instant, 0.5 seconds, 1 second, or 2 seconds between live WPM updates. Slower choices hold the number steady between active-time intervals; final results and scoring remain exact. |
| Live accuracy | Off | Shows correct attempts divided by all attempts, including corrected mistakes. |
| XP progress | On | Shows the header level/progress indicator; hiding it keeps XP accruing and leaves session XP in results. |
| Level-up notifications | On | Shows brief, nonblocking notices; turning it off dismisses an active notice and suppresses new ones. |
| Appearance | System | System/light/dark themes; System follows device changes. |

Display preferences are stored in `h2otype.preferences.v1`; existing appearance remains in `h2otype.theme`. These keys are separate from XP, Zen sessions, and personal bests. Invalid fields fall back to defaults. Storage failures keep the choices working for the visit and show an explanation in Settings. Display preferences also follow changes made in another tab.

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
