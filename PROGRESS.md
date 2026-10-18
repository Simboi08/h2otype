# h2otype — Progress and handoff

Updated: 2026-10-18

## Current state
Milestones 0–3 are complete. Sprint supports 15/30/60-second tests, a dedicated results screen, duration-specific local personal bests, and keyboard/button restart. The centered minimal layout and word-clearing input are preserved. Zen now replenishes continuously, pauses/resumes with active-time statistics, and saves a resumable local session.

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

## Post–Milestone 1 interface refinements
- Removed the hero slogans, subtitles, feature cards, footer, and decorative passage container. Appearance copy is now functional and brief.
- Centered the typing workspace in the first viewport, with responsive passage height for phones and short windows.
- Input now shows only the active word and clears on Space. Completed words remain in the passage and scoring history. Backspace from an empty input reopens the previous word; restart and session finish clear the input.
- Recorded these user-requested interface decisions in DESIGN.md and updated README gameplay instructions. No later milestone features added.

## Milestone 2 — Sprint
- Added compact 15/30/60-second controls, defaulting to 30. Changing duration resets the session and focuses input; restart keeps the selected duration.
- Results replace the passage and show WPM, accuracy, error attempts (including corrected mistakes), elapsed time, and the selected duration's personal best.
- Results focus their heading for keyboard access; Enter there or the Restart button resets and focuses the input. Existing restarts during play still work.
- Personal bests use versioned localStorage, separately for each duration. Higher WPM wins; accuracy breaks ties. Only full-duration runs with at least one correct retained character qualify. Read/write failures are reported and corrupt records are ignored without breaking play.
- Extended Sprint's fixed passage for normal full-duration runs. Reaching its end early shows results but cannot earn a best. Extracted a memoized character passage so timer ticks do not redraw unchanged text. The screen-reader description covers the upcoming excerpt rather than the entire long passage.
- Updated DESIGN.md, README.md, and ROADMAP.md. No XP or endless Zen features added.

## Text alignment correction
- Attached trailing spaces to the preceding rendered word so wrapped lines share the same left edge. Space characters still retain their original typing positions, caret, and feedback.
- Added a browser regression covering 320/375/768/1280px widths; it reproduced an 11.4px indentation before the fix.

## Milestone 3 — Zen
- Added `ZenPractice.tsx`, pure transitions/metrics in `zenEngine.ts`, and versioned persistence in `zenStorage.ts`. Sprint continues to use the existing `TypingPractice.tsx` path.
- Replenishes batches before the caret reaches the boundary. Once history grows, old words are retired while at least 200 recent characters remain editable. Correct retained characters from retired history are banked into totals; attempts/errors remain cumulative. Sixty-batch pure tests verify bounded text and no lost counts, including Unicode input.
- Escape/Pause freezes active time and opens statistics; Finish opens a resumable session summary. Resume/Enter continues and focuses input. New session clears all state and saved progress.
- Switching to Sprint first offers a summary with Go to Sprint or Resume. The draft survives mode switches; returning to Zen restores it paused.
- Hidden tabs auto-pause. Saves run every five seconds and on explicit pause/finish, pagehide, and unmount. Snapshots store elapsed active time, never reuse page-specific timestamps, and restore paused.
- Malformed snapshots are rejected. Unavailable/read-only/full storage reports a status message while the current session stays playable in memory. Uncommitted composition drafts are discarded when pausing; committed text is retained.
- Shared character rendering preserves the fixed left alignment, word clearing, and viewport-centered layout. WPM/accuracy remain hidden during play; no XP or later-stage preferences added.

## Tested
- `npm run build`: TypeScript checks and production bundle passed.
- `npm run lint`: passed.
- `CHROMIUM_PATH=/usr/bin/chromium npm test`: 44 tests passed (16 pure logic tests and 28 browser tests).
- Milestone 3 production smoke: HTTP 200, no browser JavaScript errors, desktop/320px summaries visually reviewed, and reload/resume restored 18 correct characters with exactly 10 seconds of active time.
- Milestone 2 production smoke: HTTP 200, no browser JavaScript errors, a controlled 15-second run produced 80 WPM/100% accuracy, saved its 15-second best, and Enter returned focus to fresh input. Desktop and 320px results screenshots were reviewed.
- Zen validation: boundary replenishment, bounded long-session history, cumulative/error/Unicode totals, pause/resume active time, restore validation, new-session reset, word clearing, summary/exit draft retention, hidden-tab pause, periodic saves, active reload after unsaved edits, and malformed/blocked/quota-limited storage. Phone summary layout is checked at 320px.
- Engine coverage: first-input start, idle state, WPM/accuracy, correction history, no-callback deadline expiry, completion freezing, zero elapsed time, invalid edits/overflow, untimed mode, reset, and Unicode input positions.
- Sprint regressions: all three deadlines with a controlled clock, first-input start, duration changes, Enter/button restart and focus, record reload persistence and duration separation, slower-run retention, corrupt/blocked/quota-limited storage, early-completion exclusion, and compact results at phone/landscape sizes.
- Browser coverage: existing foundation/theme checks; typing/correction and caret; deadline expiry while Appearance is open; input removal on Sprint finish; restart during/after a session; mode reset; untimed practice; native input events at mobile width; repeat/paste prevention; composition drafts and commit.
- Production app returned HTTP 200 with no JavaScript errors during typing, correction feedback, restart, and mobile scrolling. Desktop and mobile screenshots were reviewed; the active caret remained within the scrollable passage. Timer visibility is checked at 320px. Additional regressions check word clearing/cross-word correction and viewport centering without page scrolling at laptop, phone, and landscape sizes.

## Scope and known limitations
- Sprint uses a long, fixed repeating passage rather than generated text. Unusually fast early completion is shown as a result but excluded from records. Duration defaults to 30 after page reload; personal bests persist per browser and origin.
- Zen uses a small cycling local text collection. Only recent history remains editable; older characters are finalized into totals. One local draft is shared across tabs (last save wins), and a hard crash can lose up to five seconds of edits. No cloud sync or multi-tab conflict handling.
- No XP, levels, rewards, or live-statistics settings have been added. XP formula remains undecided until Milestone 4.
- Input is end-editing only; click/arrow selection cannot edit the middle of a session. Native text input is intentionally visible beneath the character-feedback passage for predictable keyboard/mobile behavior.
- Only Chromium automation has run. Real mobile keyboards, Safari, Firefox, screen-reader usability, and platform-specific IME behavior need broader testing; simulated composition and native input events pass here.
- Dependencies/lockfile remain from Milestone 0. This cloud machine uses the writable npm cache documented in README and preinstalled `/usr/bin/chromium`; Playwright's browser-download host was blocked during setup.

## Next task for Codex
Start Milestone 4 only: first document XP thresholds and scoring rules, then award XP once per valid correct character, persist total XP/level, and add unobtrusive progress/level-up feedback. Cover held keys, corrections/retyping, Zen history retirement, reload/resume, and restart so XP cannot be farmed. Preserve the minimal centered layout; customizable live-statistic preferences remain Milestone 5.
