# h2otype — Roadmap

## Milestone 0 — Project foundation
- [x] Set up Vite + React + TypeScript project and scripts
- [x] Create basic design tokens and theme switching
- [x] Establish app layout and basic navigation
- [x] Ensure build/lint succeeds

## Milestone 1 — Typing engine
- [x] Focusable keyboard-first passage component
- [x] Per-character correct/error state and caret
- [x] Reliable timer and restart
- [x] Test WPM, accuracy, and edge cases

## Milestone 2 — Sprint mode
- [x] 15/30/60-second selection
- [x] Results summary and local personal bests
- [x] Smooth restart flow

## Milestone 3 — Zen mode
- [x] Seamless text continuation without time limit
- [x] Session stats and optional summary
- [x] Reliable pause and persistence behavior

## Milestone 4 — Progression
- [x] Determine and document XP formula and level curve
- [x] Award XP once for valid correct typing
- [x] Save total XP/level and show unobtrusive level-up notifications
- [x] Add accurate session accounting and anti-farming checks

## Milestone 5 — Preferences and polish
- [x] Toggle live WPM, accuracy, XP UI, notifications
- [x] Persist all preferences
- [x] Light/dark/system themes
- [x] Responsive layout, accessibility, motion preferences, visual refinement

The planned MVP milestones are complete. Later possibilities remain optional and require a separate task.

## Post-MVP — Controls and live WPM
- [x] Tab restarts from typing and focused summary headings; Shift+Tab retains keyboard navigation
- [x] Persistent WPM refresh choices: Instant, 0.5 seconds, 1 second, or 2 seconds
- [x] Keep scoring, final results, XP, and existing saved data independent of display refresh rate

Further user feedback (fonts, interface size, sounds, and particles) is tracked in [NOTES.md](NOTES.md).

## Later possibilities
- [ ] Performance history/charts
- [ ] Streaks/flow bonuses
- [ ] Unlockable themes and caret styles
- [ ] Achievements and interesting text packs

Do not start later milestones until the current one is reasonably stable.
