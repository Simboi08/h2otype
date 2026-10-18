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

## Accessibility
- Contrast and visible caret in either theme.
- Keyboard operability, meaningful focus indicators, reduced motion, and descriptive control labels.
- Adapt gracefully to narrower screens and mobile keyboards.

## Avoid in MVP
Accounts, networking, global leaderboards, multiplayer, paid features, intense arcade effects, and complex reward economies.
