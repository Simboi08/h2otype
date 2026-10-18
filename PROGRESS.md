# h2otype — Progress and handoff

Updated: 2026-10-18

## Current state
Milestones 0–5 are complete. Sprint supports 15/30/60-second tests, a dedicated results screen, duration-specific local personal bests, and keyboard/button restart. The centered minimal layout and word-clearing input are preserved. Zen replenishes continuously, pauses/resumes with active-time statistics, and saves a resumable local session. Correct typing earns persistent XP and levels in both modes, with subtle header progress and session XP in results. Settings now controls live WPM/accuracy, the XP indicator, notifications, and appearance. The planned MVP roadmap is complete.

The first feedback update adds Tab restart in both modes and a persistent WPM refresh-rate selector. The remaining wishlist is in NOTES.md.

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

## Milestone 4 — Progression
- Documented the XP rule and level curve in DESIGN.md before implementation: one XP per first-correct character position per session, no bonuses. Level L starts at 50 × L × (L−1) lifetime XP; level 1 starts at 0.
- Added `credited` positions and cumulative `xpEarned` to the pure session engine. Backspacing keeps credits. Wrong-to-correct awards a position once; incorrect spam, invalid edits, expired input, paste/drop, held repeats, and uncommitted composition do not award XP.
- Zen shifts retained credits when retiring old words, keeping credit memory bounded while retaining cumulative session XP. Reload/resume and repeated pause/summary openings cannot replay credit.
- Added `progression.ts` for pure level calculations and `progressStore.ts` for one local XP/Zen envelope (`h2otype.progress.v1`). Every accepted Zen edit saves its snapshot and lifetime XP atomically; Sprint saves new XP immediately. Storage failure keeps both in memory and shows an unsaved indicator.
- Migrates pre-XP Zen drafts without retroactive awards, marking already-correct retained positions as credited. Canonical-profile presence prevents re-importing a stale legacy draft after New session. Appearance and Sprint personal bests remain separate and preserved.
- Added a small level/bar below the wordmark, accessible exact progress, and a four-second polite level-up notice that does not steal typing focus. No new animations; reduced-motion support remains intact. Sprint results and Zen summaries show session XP.
- Restart/New session clears the session ledger but retains lifetime XP. The action alone awards nothing; actual correct typing in a fresh session can earn XP as normal practice.
- Updated README.md/ROADMAP.md. Preference toggles and configurable live stats remain Milestone 5.

## Milestone 5 — Preferences and polish
- Added a versioned display-preference store (`preferences.ts`, `h2otype.preferences.v1`) with validated boolean defaults, immediate shared updates, storage-failure feedback, and display preference synchronization between tabs. Existing theme/XP/session/best-score storage remains intact.
- Expanded Appearance into a Settings modal with theme radios and labeled switches: live WPM/accuracy default off; XP progress/level-up notices default on.
- Added shared `LiveStats.tsx` using existing Sprint/Zen metrics, including correction history and active-time accounting. Live stats are hidden in results/paused summaries and do not announce every update.
- Hiding the XP indicator does not change XP accrual or results. Notification preference suppresses new notices and dismisses an existing notice so toggling back on cannot replay it.
- Polished focus return, keyboard modal navigation, switch hit areas, internally scrolling small-screen settings, larger action targets, responsive stats wrapping, and reduced-motion behavior. Default typing UI remains minimal and centered; no slogans or feature cards returned.
- Theme writes now occur on explicit changes, with honest storage-failure feedback; system tracking and startup flash prevention remain supported.
- Scoring, XP rules, timers, and local personal-best logic are unchanged. No later-possibility features or deployment work added.

## Post-MVP — Tab restart and WPM refresh
- Added a shared Tab shortcut for both typing fields and focused Sprint/Zen summary headings. Restart returns focus to fresh typing, retains Sprint duration, lifetime XP, and best scores, and clears Zen's resumable draft. Shift+Tab and normal navigation elsewhere remain available; Settings explains the behavior.
- Restart ignores held Tab repeats, modified keys, and active composition so ordinary shortcuts and composition cannot unexpectedly clear a run. Existing Enter restart/resume behavior is preserved.
- Added a persistent WPM refresh selector: Instant, 0.5 seconds (default), 1 second, and 2 seconds. Slower choices sample on active-time intervals rather than on each keystroke, keeping the number steady between updates without delaying the actual timer, accuracy, XP, or final results.
- New runs reset the displayed WPM immediately. Existing saved preferences safely receive the new default, and invalid interval values are ignored. Appearance, XP, bests, and Zen storage are preserved.
- Recorded all remaining feedback in NOTES.md: font/interface-size choices, standard/bitcrushed typing sounds, and optional regular/pixel particles. Those features are deferred as requested.

## Tested
- `npm run build`: TypeScript checks and production bundle passed.
- `npm run lint`: passed.
- `CHROMIUM_PATH=/usr/bin/chromium npm test -- --workers=4`: 73 tests passed (25 pure logic tests and 48 browser tests).
- Post-MVP checks: Tab restart during Sprint/Zen and from results/pause, deadline reset, focus return, retained duration/XP/bests, cleared Zen draft across reload, Shift+Tab escape, normal Settings navigation, held/modified/composing Tab suppression, preference validation/migration, sampled WPM in both modes, Instant changes, immediate display reset, saved refresh choice, and exact results/XP despite slower display updates.
- Post-MVP production smoke: HTTP 200 with no JavaScript errors; 320px dark Settings screenshot reviewed with no horizontal overflow; Tab reset/refocus and refresh-preference reload persistence verified.
- Milestone 5 production smoke: HTTP 200 with no JavaScript errors; 50 correct characters over 10 active seconds displayed 60 WPM and 100% accuracy; dark theme persisted after reload; a live-WPM preference change from another tab propagated. Desktop and 320px Settings/live-stat screenshots were reviewed.
- Milestone 4 production smoke: HTTP 200 with no JavaScript errors; 100 correct Sprint characters earned 100 XP and level 2, the level-up kept input focus, results showed +100 XP, and reload retained level/XP. Desktop and 320px screenshots were visually reviewed.
- Milestone 3 production smoke: HTTP 200, no browser JavaScript errors, desktop/320px summaries visually reviewed, and reload/resume restored 18 correct characters with exactly 10 seconds of active time.
- Milestone 2 production smoke: HTTP 200, no browser JavaScript errors, a controlled 15-second run produced 80 WPM/100% accuracy, saved its 15-second best, and Enter returned focus to fresh input. Desktop and 320px results screenshots were reviewed.
- Zen validation: boundary replenishment, bounded long-session history, cumulative/error/Unicode totals, pause/resume active time, restore validation, new-session reset, word clearing, summary/exit draft retention, hidden-tab pause, periodic saves, active reload after unsaved edits, and malformed/blocked/quota-limited storage. Phone summary layout is checked at 320px.
- Progression coverage: level boundaries, first-correct credits, wrong/repeated corrections, invalid/late input, Unicode/spaces, bounded Zen retirement, legacy migration, malformed profile/credit validation, held repeats, immediate persistence, restart/new-session accounting, reload/replay prevention, nonblocking level-ups, results XP, and storage failures.
- Preferences checks: documented defaults, independent toggles, reload/theme persistence, accurate Sprint correction/live stats, Zen active-time stats, display-only XP hiding, notification suppression/dismissal, keyboard focus/switches/skip link, malformed/blocked storage, and phone/landscape layouts with all displays and reduced motion.
- Engine coverage: first-input start, idle state, WPM/accuracy, correction history, no-callback deadline expiry, completion freezing, zero elapsed time, invalid edits/overflow, untimed mode, reset, and Unicode input positions.
- Sprint regressions: all three deadlines with a controlled clock, first-input start, duration changes, Enter/button restart and focus, record reload persistence and duration separation, slower-run retention, corrupt/blocked/quota-limited storage, early-completion exclusion, and compact results at phone/landscape sizes.
- Browser coverage: existing foundation/theme checks; typing/correction and caret; deadline expiry while Appearance is open; input removal on Sprint finish; restart during/after a session; mode reset; untimed practice; native input events at mobile width; repeat/paste prevention; composition drafts and commit.
- Production app returned HTTP 200 with no JavaScript errors during typing, correction feedback, restart, and mobile scrolling. Desktop and mobile screenshots were reviewed; the active caret remained within the scrollable passage. Timer visibility is checked at 320px. Additional regressions check word clearing/cross-word correction and viewport centering without page scrolling at laptop, phone, and landscape sizes.

## Scope and known limitations
- Sprint uses a long, fixed repeating passage rather than generated text. Unusually fast early completion is shown as a result but excluded from records. Duration defaults to 30 after page reload; personal bests persist per browser and origin.
- Zen uses a small cycling local text collection. Only recent history remains editable; older characters are finalized into totals. The local XP/draft profile is intended for one active tab (last save wins); each edit saves text/XP atomically, while a hard crash can lose up to five seconds of active elapsed time. No cloud sync or multi-tab conflict handling.
- All MVP preference toggles are implemented. No bonuses, cosmetic rewards, accounts, or cloud sync are included; progression stays local to this browser/origin.
- Input is end-editing only; click/arrow selection cannot edit the middle of a session. Native text input is intentionally visible beneath the character-feedback passage for predictable keyboard/mobile behavior.
- Only Chromium automation has run. Real mobile keyboards, Safari, Firefox, screen-reader usability, and platform-specific IME behavior need broader testing; simulated composition and native input events pass here.
- Dependencies/lockfile remain from Milestone 0. This cloud machine uses the writable npm cache documented in README and preinstalled `/usr/bin/chromium`; Playwright's browser-download host was blocked during setup.

## Next task for Codex
The planned MVP milestones are complete. User feedback is captured in [NOTES.md](NOTES.md). The requested first update implements Tab restart and WPM refresh controls. Remaining wishlist: font/interface-size controls, typing sounds, and optional particle effects later, as separate tested changes. Preserve the minimal centered interface, word-clearing input, scoring/XP rules, and existing local data unless the user requests a change.
