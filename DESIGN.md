# h2otype — Design specification v0.5

## Game feedback and direct navigation — 2026-10-19
The user wants the experience to feel fun and rewarding as a game. Make earned combo/level feedback visible and satisfying while retaining readable typing and explicit effect controls. This update supersedes the earlier Zen exit confirmation and scanline treatment.

- Clicking the top Sprint button switches immediately from active, paused, finished, or empty Zen. Unmount saves a paused draft and exact active elapsed time through the existing atomic progress store. Returning to an existing Zen draft offers Resume; no extra button gates the Sprint switch. Pause and Finish retain their explicit summaries.
- Level announcements scale up over 320ms, hold, and shrink over a matching reversed 320ms curve before removal at four seconds. Low graphics, Effects Off, and reduced motion keep a static announcement. Disabling notifications dismisses it immediately as an explicit preference change.
- Visual effects has a three-stop Off/Balanced/Intense slider, default Intense. Screen shake defaults on and has an independent switch. Saved preferences receive the new defaults without overwriting explicit sound/particle/quality choices, XP, records, or drafts. Effect intensity is separate from graphics quality/performance.
- Intense combos add large pixel fire jets at the bottom screen corners, six bounded embers, a stronger meter, and taller high-tier flames. Keep the large jets outside the controls so opaque inputs/buttons do not mask them; meter flames remain local. Balanced reduces jet size and removes embers. Off keeps plain combo/progress meters and notices, disables decorative bursts/fire/shake and level-up motion, and settles XP immediately. Combo counting and sound pitch remain independent of visual intensity.
- Screen shake is a 160ms pulse on the practice surface at tier gains and, from 50 correct characters, crossed 20-character milestones. Strength caps at 3px (Balanced: 0.8px), with at most one animation and a 250ms cooldown. Restart, hiding, pause/finish, unmount, changing intensity, or disabling shake cancel it. No constant per-keystroke shake. Fixed particle/notice layers stay outside the moving surface.
- Low/reduced motion override shake and moving fire. Low removes embers/glow; reduced motion retains static flames without embers. Decorative effects never intercept pointer events or keyboard focus.
- Remove the full-screen scanline overlay and celebration tint. The clean navy/sky canvas, pixel HUD, local edge fire, and deliberate motion provide the arcade identity. Do not reintroduce an always-on screen filter.

## Arcade feel and combos — 2026-10-19
The latest feedback adds adjustable character spacing and independent live-stat sizes, larger/sparser pixel particles, stronger crunch audio, a grander level-up celebration, a graphics slider, and correct-typing combos. Achievements and unlockable themes remain deferred.

- Character spacing: 0–3px in 0.5px steps, default 0. Apply to passage and word input; remeasure the caret after a change. WPM/accuracy size sliders are independent, 80–200% in 10% steps, default 100%, with a 14px base label/value size. These affect live statistics only; their visibility switches stay independent.
- Graphics quality uses a three-stop Low/Medium/High slider, preserving existing saved tier strings and rendering budgets. Pixel sprites are 6×6 CSS pixels (previously 3×3), with 2/4/6 per burst and caps of 12/24/36; Regular particles retain the table below.
- Level-ups show a larger centered banner above the passage, a single expanding ring, and 14 (Medium) or 24 (High) pixel rays. Effects never intercept pointers or focus. Low/reduced motion use the large static banner only; notification Off suppresses everything. Compact landscape placement preserves passage visibility.
- Combos start at 10 fresh correct character positions, including spaces, with tiers at 10/25/50/100/200. The meter replaces the visible footer hint instead of adding another row, grows warmer fire at higher tiers, and progressively raises the selected typing sound up to seven semitones (below 1.5× playback rate). The original hint remains available to screen readers.
- A mistake, any accepted deletion, pause/finish, hidden page, restart, mode change, or reload breaks the streak. Already credited positions cannot rebuild it through Backspace/retyping. Accepted multi-character commits count their fresh correct positions in order; Zen retirement preserves an active streak. Inactivity and opening Settings alone do not break a streak.
- Combos are feedback only: no XP or score multiplier, no change to WPM, accuracy, deadlines, persistence, or credit rules. Combo feedback defaults on and can be disabled in Settings; re-enabling starts fresh. Low uses static flames/no glow; reduced motion removes flame/meter animation as well as celebration motion.
- Crunch is now a 95ms saturated, quantized square/sub-kick with a sharper transient, lower body, and clean zero-amplitude ending. Standard is unchanged. Pitch changes reuse the cached sound buffer; volume, mute, delayed-note suppression, and four-voice headroom still apply.

## Current direction — arcade refresh, 2026-10-19
The user's Krillion references replace the original Cupertino presentation with an original pixel-arcade visual system: navy/cyan/pink in dark mode, sky/ink in light mode, pixel HUD typography, crisp panels, and a prominent XP rail. Keep the passage central, existing typing controls, theme/preference choices, and all scoring/progression rules. This direction supersedes the earlier small-header-XP and Cupertino styling decisions below. The latest update removes the screen filter and strengthens configurable game effects.

- Particles originate two pixels beyond the letter's right edge, with initial angles −90° to +90° around the positive x-axis.
- Graphics Low/Medium/High control particle budgets, canvas resolution/frame caps, atmosphere/glow, and XP animation cost. Reduced motion overrides animation on every tier.
- XP uses a wide rail near the passage, easing in/out toward earned XP and rolling across level boundaries. Accessible XP updates immediately; animation cannot award XP or delay typing. Level-ups get a large, nonblocking banner following the notification preference.
- The 8-bit click gains a stronger quantized attack/body while retaining volume, mute, short duration, and bounded voices.

## Vision
A focused typing game with the atmosphere of a pixel arcade: a navy/cyan/pink HUD in dark mode, a sky/ink palette in light mode, sharp panels, and locally bundled pixel labels. The passage remains easy to read while fiery combos, brief impacts, a prominent XP rail, and level-up announcements make progression satisfying. The user's Krillion screenshots guide the palette and pixel typography; the later feedback removes CRT filtering.

## Design principles
1. The passage is always the focal point.
2. Comfortable spacing, refined typography, subtle boundaries; avoid clutter, visual noise, and heavy skeuomorphism.
3. Crisp arcade controls with native form behavior, preference controls, and keyboard shortcuts.
4. Support light/dark/system theme (system by default), both themes deliberately designed.
5. Motion communicates state; never blocks typing; support reduced motion.
6. No visible start button required: first valid typing input starts the session.

## Layout
- Compact header: pixel h2otype wordmark, Sprint/Zen selector, settings/theme access. A wide optional XP rail sits immediately above the typing workspace.
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
- Switching to Sprint is immediate and saves a paused Zen draft without penalizing the user.
- Milestone 3: Escape/Pause freezes active time; Finish opens a resumable summary. Enter from the summary heading resumes. New session explicitly clears the draft. The latest update removes the original Go to Sprint confirmation step.
- Hiding the page pauses Zen. Reloaded sessions restore paused, excluding offline time. Ordinary field blur and Settings leave active time running.
- Keep a single versioned local draft, autosaving every five seconds and on lifecycle/explicit pause or finish. Failed storage must not interrupt the current session.
- Retain at least 200 recent characters for correction and finalize older correct characters into totals, keeping text and DOM bounded. Live WPM/accuracy are off by default and can be enabled independently; pause/finish always shows session statistics. Session XP is included in the summary from Milestone 4.

## Progression
- Correctly completed characters earn base XP, exactly once per character.
- Accuracy/flow bonuses may be added after core mechanics work; cap bonuses and ensure no exploitable key-repeat loop.
- Continuous Zen XP, level advancement, and persistent cumulative progress.
- Level-ups: a prominent cyan/pink nonblocking banner on the XP rail, never an overlay that intercepts typing or steals focus.
- Cosmetic rewards / unlockable themes are later-stage ideas, not MVP commitments.
- Milestone 4 rule: award 1 XP per character position the first time it is typed correctly in that session, including spaces and punctuation. A correction from wrong to correct can earn its first XP; deleting/retyping a credited position cannot. Composition earns only after commit; paste/drop and held character repeats remain blocked. No speed, accuracy, or flow bonuses yet.
- XP is retained when text is deleted or a session is abandoned. Restart/new session alone awards nothing; actual correct typing in a new session is fresh practice and can earn XP.
- Level 1 begins at 0 XP. Advancing from level L costs 100 × L XP; lifetime threshold for level L is 50 × L × (L−1). Thus levels 2/3/4 begin at 100/300/600 XP. Level is derived from lifetime XP rather than stored independently.
- Show the level, current/required XP, lifetime XP, and next level on a wide rail above the passage. Animate the visual fill with cubic acceleration/deceleration; integer levels roll over as animated lifetime XP crosses a threshold. Accessible values and labels update immediately from the real saved XP. Results/summaries include session XP; display and notification toggles remain independent.
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
- Apply the tier budgets below to a pointer-transparent canvas that animates only while particles are alive. Clear on restart/pause/finish, page hiding, resize, tier changes, and unmount. Suppress entirely under reduced motion, without replaying old bursts when re-enabled.
- These optional restrained particles are the user-requested post-MVP exception to the original effects scope. Scoring, progression, deadlines, live-stat math, and the minimal default screen remain unchanged.

## Graphics tiers and assets
| Tier | Particles / burst | Maximum | Lifetime | Canvas DPR cap | Frame cap | XP fill |
| --- | --- | --- | --- | --- | --- | --- |
| Low | 3 | 24 | 240ms | 1 | 30fps | Instant |
| Medium (default) | 7 | 70 | 400ms | 1.5 | 60fps | 600ms ease-in/out |
| High | 12 | 144 | 520ms | 2 | 60fps | 850ms ease-in/out |

Low removes the backdrop, bloom, modal blur, and level-banner motion, and keeps fire static. Medium has subtle static atmosphere; High increases static glow and atmosphere. Scanlines are removed at every tier. Reduced motion makes XP instant and removes particle/banner/fire/shake motion regardless of tier. Graphics choices do not change scoring, XP, or sound volume.

Silkscreen Regular is bundled locally under SIL OFL 1.1, with its license in public/fonts. It is used only for the HUD; the passage retains its selectable built-in fonts. Background stars, horizon, panels, fire, and glow are CSS; no third-party images or runtime font services are required. Standard audio remains a 35ms click; 8-bit crush uses the stronger 95ms envelope described above, with the existing four-voice cap and volume controls.

## Accessibility
- Contrast and visible caret in either theme.
- Keyboard operability, meaningful focus indicators, reduced motion, and descriptive control labels.
- Adapt gracefully to narrower screens and mobile keyboards.

## Avoid in MVP
Accounts, networking, global leaderboards, multiplayer, paid features, intense arcade effects, and complex reward economies.
