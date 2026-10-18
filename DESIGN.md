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

### Zen
- No hard time limit or mandatory completion.
- Advance through generated word batches continuously; typing should not freeze on a batch boundary.
- XP persists periodically and when finishing/pausing the session.
- Exiting Zen should offer a session summary without penalizing the user.

## Progression
- Correctly completed characters earn base XP, exactly once per character.
- Accuracy/flow bonuses may be added after core mechanics work; cap bonuses and ensure no exploitable key-repeat loop.
- Continuous Zen XP, level advancement, and persistent cumulative progress.
- Level-ups: small nonblocking toast/glow, never an overlay that disrupts typing.
- Cosmetic rewards / unlockable themes are later-stage ideas, not MVP commitments.
- XP thresholds and precise scoring formula to be chosen and documented before implementation.

## Preferences
- Live WPM: off by default.
- Live accuracy: off by default.
- XP progress indicator: on by default, visually unobtrusive.
- Level-up notifications: on by default.
- Theme: system/light/dark, default system.
- Settings persist locally.

## Accessibility
- Contrast and visible caret in either theme.
- Keyboard operability, meaningful focus indicators, reduced motion, and descriptive control labels.
- Adapt gracefully to narrower screens and mobile keyboards.

## Avoid in MVP
Accounts, networking, global leaderboards, multiplayer, paid features, intense arcade effects, and complex reward economies.
