# h2otype — Ideas and feedback

Captured: 2026-10-18. All currently requested controls and customization ideas are implemented.

Feedback added: 2026-10-19.

## Controls
- [x] Quick restart with **Tab**.
- [x] Tab follow-up: fixed the gap where restart navigated through controls when focus left the typing field. The shortcut now covers the whole game page; neither Tab nor Shift+Tab navigates game-page controls. Settings retains normal keyboard navigation and opens with F2.
- [x] Typing is ready without clicking the input first. Ready sessions autofocus; typing after focus leaves the field preserves the first character. Remove the large workspace/input focus outline while retaining the passage caret and Settings focus cues.
- [x] Apply restart consistently to Sprint and Zen, return focus to typing, and retain lifetime XP and personal bests. Settings explains that restarting Zen clears its resumable draft.

## Typing appearance
- [x] Add a menu for choosing the typing font and adjusting the size of the typing interface: Monospace/System/Serif and 80–130% size.
- [x] Add font weight (boldness): Regular, Medium, Semibold, and Bold.
- [x] Keep the passage aligned and centered, including on phones and short screens. Font and size changes preserve the current session and keep the caret visible.

## Live statistics
- [x] Let the user choose how often the WPM counter refreshes: Instant, 0.5 seconds (default), 1 second, or 2 seconds. Persist the choice in Settings.
- [x] Change only how often the number is displayed. Keep timing, scoring, XP, and final results accurate and independent of this setting.
- [x] Use a sliding bar for WPM refresh rate instead of the dropdown, with labeled values for Instant, 0.5 seconds, 1 second, and 2 seconds.

## Sound
- [x] Add typing sound effects, with Standard and 8-bit crush styles and a Preview sound button.
- [x] Provide an Off option (default) and volume control in Settings. Bound overlapping voices and discard delayed sounds during fast typing.

## Particle effects
- [x] Small spurts of particles from the correctly typed letter, with 8-bit pixel and Regular styles.
- [x] Settings controls with Off by default. Effects are optional, bounded, and suppressed under reduced motion.

## Suggested order
1. Tab restart and configurable WPM refresh rate — implemented.
2. Font, font-weight, interface-size controls, and the WPM slider — implemented and checked first.
3. Sound styles and volume — implemented and checked next.
4. Optional particles — implemented and checked with sound feedback.

## Arcade feedback refresh
- [x] Emit particles from the front/right edge of the letter in a right-facing 180° fan, spanning up and down around the positive x-axis.
- [x] Add Low/Medium/High graphics tiers controlling particle density, frame/resolution budgets, glow, scanlines, and XP motion.
- [x] Make progression more prominent with a wide XP bar, accelerating/decelerating fill, and a larger nonblocking level-up banner.
- [x] Give the 8-bit crunch more attack/body while retaining volume, mute, and bounded playback.
- [x] Adopt the supplied Krillion-style pixel-arcade direction: navy/cyan/pink, pixel HUD labels, crisp panels, and a subtle CRT atmosphere, with a matching light mode.

See PROGRESS.md for implementation and validation details. Add new feedback here as it comes up.
