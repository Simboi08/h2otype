# h2otype — Progress and handoff

Updated: 2026-10-18

## Current state
Milestones 0 and 1 are complete. The React + TypeScript + Vite foundation now has a working typing engine. Sprint is fixed 30-second, single-passage practice; Zen is untimed single-passage practice until its endless mode milestone.

## Completed
### Milestone 0
- Responsive Cupertino-inspired layout, shared CSS tokens, system fonts, Sprint/Zen navigation, and light/dark/system appearance.
- Persistent appearance with safe storage fallback, native dialog, visible focus, skip link, and reduced-motion support.
- npm lockfile and development/build/lint/preview/test scripts.

### Milestone 1
- Added `TypingPractice.tsx`: a keyboard-focusable native text input, per-character correct/error feedback (errors also underlined), blinking caret, and passage scrolling to keep the active character visible.
- Added append/backspace editing, mobile input-event support, and composition drafts that commit once. Paste/drop and held character repeats are blocked. Ordinary keyboard navigation outside the field remains available.
- First committed character starts the session. Sprint uses an absolute 30-second deadline; typing checks the deadline independently of interval callbacks. Late callbacks cannot extend the session. Finishing the passage also ends it.
- Restart clears typing, attempt history, time, and scroll and returns focus to input. Changing mode creates a fresh session. Focus loss and Appearance do not pause time.
- Added pure session and metrics functions in `typingEngine.ts`, separate from React. Correct retained characters determine WPM using a five-character word. Accuracy counts all attempts, including corrected mistakes; Backspace cannot erase mistake history. Zero elapsed time produces 0 WPM. Input positions count Unicode code points consistently.
- Live WPM/accuracy remain hidden by default. A minimal end-of-session readout exposes the engine's calculated WPM, accuracy, and incorrect attempts; no dedicated results screen or record persistence yet.
- Updated README with gameplay, scoring conventions, scope, and validation commands. Marked Milestone 1 complete in ROADMAP.md.

## Tested
- `npm run build`: TypeScript checks and production bundle passed.
- `npm run lint`: passed.
- `CHROMIUM_PATH=/usr/bin/chromium npm test`: 16 tests passed (8 pure engine tests and 8 browser tests).
- Engine coverage: first-input start, idle state, WPM/accuracy, correction history, no-callback deadline expiry, completion freezing, zero elapsed time, invalid edits/overflow, untimed mode, reset, and Unicode input positions.
- Browser coverage: existing foundation/theme checks; typing/correction and caret; deadline expiry while Appearance is open; read-only finish; restart during/after a session; mode reset; untimed practice; native input events at mobile width; repeat/paste prevention; composition drafts and commit.
- Production app returned HTTP 200 with no JavaScript errors during typing, correction feedback, restart, and mobile scrolling. Desktop and mobile screenshots were reviewed; the active caret remained within the scrollable passage. Timer visibility is checked at 320px.

## Scope and known limitations
- Sprint duration selection, a dedicated results screen, personal bests, and improved restart flow are Milestone 2.
- Zen currently has one passage and no pause/resume feature. Endless replenishment, session summaries, and persistence are Milestone 3.
- No XP, levels, rewards, live-statistics settings, or personal-best storage has been added. XP formula remains undecided until Milestone 4.
- Input is end-editing only; click/arrow selection cannot edit the middle of a session. Native text input is intentionally visible beneath the character-feedback passage for predictable keyboard/mobile behavior.
- Only Chromium automation has run. Real mobile keyboards, Safari, Firefox, screen-reader usability, and platform-specific IME behavior need broader testing; simulated composition and native input events pass here.
- Dependencies/lockfile remain from Milestone 0. This cloud machine uses the writable npm cache documented in README and preinstalled `/usr/bin/chromium`; Playwright's browser-download host was blocked during setup.

## Next task for Codex
Start Milestone 2 only: add 15/30/60-second Sprint selection, a proper results summary with local personal bests, and a smooth restart flow. Reuse the pure typing engine and extend its tests. Keep endless Zen and XP for their own milestones.
