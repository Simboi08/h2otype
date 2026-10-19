# h2otype — Design specification v0.2

## Vision
A typing game that looks and feels like a polished macOS application. Think Apple's Cupertino design language: typography, whitespace, neutral surfaces, and restrained motion. Underneath the calm interface is compelling long-term progression.

## Design principles
1. The passage is always the focal point.
2. Comfortable spacing, refined typography, subtle boundaries; avoid clutter, visual noise, and heavy skeuomorphism.
3. Native-feeling segmented controls, buttons, preference toggles, and keyboard shortcuts.
4. Support light/dark/system theme (system by default), both themes deliberately designed.
5. Motion communicates state; never blocks typing; support reduced motion.
6. No visible start button required: first valid typing input starts the session.

## Layout
- Compact header: h2otype wordmark, Sprint/Zen selector, settings/theme access, optional level indicator.
- Centerpiece: readable multiline typing passage, per-character correct/incorrect feedback, animated caret, smooth text advancement.
- Low-emphasis supporting controls and context-sensitive hint text.
- Results screen for Sprint: WPM, accuracy, errors, XP gained, restart.
- Zen mode: continuous text replenishment, uninterrupted typing, XP awarded incrementally.

## Interface refinement (2026-10-18)
- Center the typing workspace in the initial viewport; no page scrolling should be needed to reach it at common laptop and phone sizes.
- Keep the screen to the compact header, passage, timer, word input, and Restart. Omit promotional headings, motivational slogans, feature cards, and footer copy.
- The input shows only the active word. Space commits the word and clears the field while feedback and scoring history remain in the passage. Backspace from an empty field reopens the previous word for correction.

## Modes
### Sprint
- 15s, 30s, 60s durations.
- Timer begins with first typing input.
- Live WPM and accuracy are OFF by default, optionally shown through Settings.
- End-of-test performance summary and personal-best tracking.
- Milestone 2: default to 30 seconds; changing duration resets the run. Keep the duration control compact and keep live WPM/accuracy hidden.
- Results replace the passage and show WPM, accuracy, incorrect attempts (including corrected mistakes), time, and the duration-specific personal best. Enter from the focused results heading or Restart returns focus to typing.
- Personal bests compare WPM first and accuracy on ties. Only full-duration runs with at least one correct character qualify; partial/early-completed runs are excluded. Store records locally per browser. Milestone 4 adds session XP to results without adding a disruptive overlay.

### Zen
- No hard time limit or mandatory completion.
- Advance through generated word batches continuously; typing should not freeze on a batch boundary.
- XP persists periodically and when finishing/pausing the session.
- Exiting Zen should offer a session summary without penalizing the user.
- Milestone 3: Escape/Pause freezes active time; Finish opens a resumable summary. Enter from the summary heading resumes. New session explicitly clears the draft. Switching to Sprint first offers the summary with a Go to Sprint action.
- Hiding the page pauses Zen. Reloaded sessions restore paused, excluding offline time. Ordinary field blur and Settings leave active time running.
- Keep a single versioned local draft, autosaving every five seconds and on lifecycle/explicit pause or finish. Failed storage must not interrupt the current session.
- Retain at least 200 recent characters for correction and finalize older correct characters into totals, keeping text and DOM bounded. Live WPM/accuracy are off by default and can be enabled independently; pause/finish always shows session statistics. Session XP is included in the summary from Milestone 4.

## Progression
- Correctly completed characters earn base XP, exactly once per character.
- Accuracy/flow bonuses may be added after core mechanics work; cap bonuses and ensure no exploitable key-repeat loop.
- Continuous Zen XP, level advancement, and persistent cumulative progress.
- Level-ups: small nonblocking toast/glow, never an overlay that disrupts typing.
- Cosmetic rewards / unlockable themes are later-stage ideas, not MVP commitments.
- Milestone 4 rule: award 1 XP per character position the first time it is typed correctly in that session, including spaces and punctuation. A correction from wrong to correct can earn its first XP; deleting/retyping a credited position cannot. Composition earns only after commit; paste/drop and held character repeats remain blocked. No speed, accuracy, or flow bonuses yet.
- XP is retained when text is deleted or a session is abandoned. Restart/new session alone awards nothing; actual correct typing in a new session is fresh practice and can earn XP.
- Level 1 begins at 0 XP. Advancing from level L costs 100 × L XP; lifetime threshold for level L is 50 × L × (L−1). Thus levels 2/3/4 begin at 100/300/600 XP. Level is derived from lifetime XP rather than stored independently.
- Keep a small level/bar by the wordmark and a brief polite level-up notice that never steals focus. Results/summaries include session XP. Respect reduced motion; Milestone 5 provides independent display and notification toggles.
- Save lifetime XP and the credited Zen draft together in one versioned localStorage envelope on each accepted edit. This keeps a reload from restoring older credit history against a newer XP balance. Older pre-XP Zen drafts migrate without granting retroactive XP; their already-correct retained positions are marked credited.

## Preferences
- Live WPM: off by default.
- Live accuracy: off by default.
- XP progress indicator: on by default, visually unobtrusive.
- Level-up notifications: on by default.
- Theme: system/light/dark, default system.
- Settings persist locally; changes apply immediately in both modes without restarting the session.
- Milestone 5 groups theme radios and display switches into one Settings dialog. Hiding XP progress does not stop earning XP or hide results; disabling notifications suppresses and dismisses notices without changing level calculation.
- Live statistics use a compact, non-announcing row near the timer and wrap on phones. The default interface keeps both live statistics hidden.
- Keep keyboard focus inside the modal, Escape dismissal, sensible focus return, larger control hit areas, and reduced-motion support. On short screens, scroll the modal internally with Close remaining reachable.

## Post-MVP controls and WPM refresh
- Unmodified Tab restarts from anywhere on the game page, including initial/blurred focus, header buttons, the passage, and results, returning focus to a fresh input. Sprint retains its selected duration; Zen clears its resumable draft. Lifetime XP and personal bests remain intact. This expands the original field/heading-only shortcut following feedback on 2026-10-19.
- Neither Tab nor Shift+Tab cycles through game-page controls. Tab restarts; Shift+Tab keeps/returns focus to active typing without resetting the session, and stays on the summary if typing is stopped. Even held/composing Tab events cannot navigate the page. Browser/OS shortcuts using Ctrl/Alt/Meta remain untouched.
- F2 opens Settings directly by keyboard. Inside Settings, Tab/Shift+Tab retain normal navigation and cannot restart a run. Closing Settings returns to active typing or the current summary.
- Ready sessions focus the real typing input on arrival and mode/duration changes, without starting the timer. After clicking the passage or losing input focus, typing returns to the input before the browser inserts the first character; scoring still uses native input/composition events. Paused, restored, and finished sessions retain their explicit resume/restart behavior.
- Omit focus outlines on the page container and typing input: the passage caret communicates typing focus. Keep visible focus cues on Settings controls. This intentionally replaces the earlier Shift+Tab page navigation following user feedback on 2026-10-19.
- WPM refresh choices: Instant (every existing metric update), 0.5 seconds (default), 1 second, or 2 seconds. Persist this choice with existing preferences and apply it to both modes without clearing the session.
- Slower choices hold the displayed WPM until the next active-time interval. Accuracy, session clocks, scoring, XP, and final results remain independent of that display cadence. Restart resets the live display immediately; pausing hides it and resuming shows a fresh sample.
- WPM refresh uses a labeled four-stop slider, preserving the existing saved millisecond values and scoring behavior.

## Typing customization and feedback
- Typing appearance: built-in Monospace (default), System, and Serif stacks; weight Regular/Medium/Semibold/Bold (400/500/600/700); interface size 80–130% in 10% steps, default 100%. Apply to the passage and word input, with workspace width scaling within the viewport. Keep input text at least 16px for mobile keyboards. Changing any choice preserves the current run and keeps the caret visible.
- Persist new choices alongside existing version-1 preferences, validating fields independently so old saves receive defaults without changing XP, themes, Zen drafts, or bests. Settings remains internally scrollable and fully keyboard operable.
- Sound: Off (default), Standard, or 8-bit crush, with a 0–100% volume slider (default 35%) and Preview sound. Generate short local click/pluck buffers; never download assets or require sound to play. Accepted character edits, including mistakes/corrections and composition commits, play one click per edit; Backspace, rejected input, paste/drop, held repeats, and expired/paused input stay silent.
- Keep at most four short sound voices, discard delayed notes, and stop voices on mute, hidden pages, restarts, pause/finish, and mode changes. Unavailable audio reports a Settings status without affecting typing.
- Particles: Off (default), Regular circles, or 8-bit pixels. Emit a small burst from the newly rendered correct character, including a valid correction even when that position already earned XP. Wrong characters and deletion never emit. A multi-character commit emits at most one burst at its newest correct retained character.
- Limit particles to 48 total, with six per burst and a 360ms lifetime; animate a pointer-transparent canvas only while particles are alive. Clear on restart/pause/finish, page hiding, resize, and unmount. Suppress entirely under reduced motion, without replaying old bursts when re-enabled.
- These optional restrained particles are the user-requested post-MVP exception to the original effects scope. Scoring, progression, deadlines, live-stat math, and the minimal default screen remain unchanged.

## Accessibility
- Contrast and visible caret in either theme.
- Keyboard operability, meaningful focus indicators, reduced motion, and descriptive control labels.
- Adapt gracefully to narrower screens and mobile keyboards.

## Avoid in MVP
Accounts, networking, global leaderboards, multiplayer, paid features, intense arcade effects, and complex reward economies.
