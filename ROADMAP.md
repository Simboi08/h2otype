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
- [x] Tab restarts anywhere on the game page; neither Tab direction navigates page controls; F2 opens Settings, which retains normal keyboard navigation
- [x] Ready-to-type focus without a preliminary click or a large workspace/input outline
- [x] Persistent WPM refresh choices: Instant, 0.5 seconds, 1 second, or 2 seconds
- [x] Keep scoring, final results, XP, and existing saved data independent of display refresh rate

## Post-MVP — Typing customization
- [x] Built-in typing fonts, font weight, and responsive interface-size controls
- [x] Labeled WPM refresh slider using the existing four intervals
- [x] Optional Standard/8-bit crush sounds, preview, volume, and mute
- [x] Optional Regular/8-bit pixel particles on correct characters, with reduced-motion support
- [x] Persist new preferences without changing existing progress or sessions

## Post-MVP — Arcade feedback refresh
- [x] Right-edge particle origin with a right-facing 180° fan
- [x] Persistent Low/Medium/High graphics tiers with actual rendering budgets
- [x] Larger XP rail with accelerating/decelerating motion and a prominent level-up banner
- [x] Stronger 8-bit crunch within the existing volume/voice limits
- [x] Pixel-arcade dark/light presentation inspired by the supplied references
- [x] Preserve typing focus, reduced motion, optional effects, existing scores, and saved progress

## Post-MVP — Arcade feel and combos
- [x] Persistent character-spacing and independent live WPM/accuracy size sliders
- [x] Three-stop graphics slider preserving saved quality tiers
- [x] Larger, sparser 8-bit particles and a stronger 95ms crunch
- [x] Grand level-up banner, ring, and pixel burst respecting motion/notification/quality settings
- [x] Correct-typing combo meter, escalating vignette, and bounded rising sound pitch
- [x] Keep combos separate from scoring/XP and prevent credit replay through corrections

## Post-MVP — Game feedback and direct navigation
- [x] Level announcements shrink out as quickly as they scale in
- [x] Direct Zen-to-Sprint switching with preserved paused drafts and active-time accounting
- [x] Larger edge fire and short milestone shake on by default (fire later replaced by vignette below)
- [x] Independent Visual effects intensity slider and Screen shake switch
- [x] Remove the full-screen scanline/filter overlay; retain reduced-motion/Low/Off fallbacks

## Post-MVP — Word sets and combo vignette
- [x] Local English 100/500/1,000 common-word pools and the original sentences
- [x] Header word-set picker beside Settings, F3 shortcut, remembered choices
- [x] Fresh randomized Sprint runs and resumable, continuously generated Zen
- [x] Separate best scores per pool/duration and preserve old drafts/XP/records
- [x] Replace all flame sprites with a combo-driven edge vignette
- [x] Stronger Intense shake, with independent intensity/shake and Low/reduced-motion controls

The current implementation requests are complete. Achievements and unlockable themes remain deferred; further notes and future tester feedback can be added in [NOTES.md](NOTES.md).

## Later possibilities
- [ ] Performance history/charts
- [ ] Flow/XP bonuses (visual typing streaks are implemented; no bonuses)
- [ ] Unlockable themes and caret styles
- [ ] Achievements and interesting text packs

Do not start later milestones until the current one is reasonably stable.
