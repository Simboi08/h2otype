# h2otype — Ideas and feedback

Captured: 2026-10-18. Tab restart and WPM refresh controls are implemented; the remaining ideas are for later updates.

Feedback added: 2026-10-19.

## Controls
- [x] Quick restart with **Tab**.
- [x] Tab follow-up: fixed the gap where restart navigated through controls when focus left the typing field. The shortcut now covers the whole game page, preserving normal Tab in Settings and Shift+Tab navigation.
- [x] Apply restart consistently to Sprint and Zen, return focus to typing, and retain lifetime XP and personal bests. Settings explains that restarting Zen clears its resumable draft.

## Typing appearance
- Add a menu for choosing the typing font and adjusting the size of the typing interface.
- Add font weight (boldness) adjustment alongside font and size choices.
- Keep the passage aligned and centered, including on phones and short screens. Font and size changes should preserve the current session.

## Live statistics
- [x] Let the user choose how often the WPM counter refreshes: Instant, 0.5 seconds (default), 1 second, or 2 seconds. Persist the choice in Settings.
- [x] Change only how often the number is displayed. Keep timing, scoring, XP, and final results accurate and independent of this setting.
- Idea: use a sliding bar for WPM refresh rate instead of the current dropdown. Consider labeled stops for Instant, 0.5 seconds, 1 second, and 2 seconds; this is not implemented yet.

## Sound
- Add typing sound effects, with standard and bitcrushed/8-bit styles.
- Provide an Off option and volume control in Settings. Avoid overlapping sounds building up during fast typing.

## Particle effects — later
- Small spurts of particles from the correctly typed letter, with pixel/8-bit and regular styles.
- Add Settings controls later. Keep effects optional and restrained, respect reduced motion, and preserve typing responsiveness.

## Suggested order
1. Tab restart and configurable WPM refresh rate — implemented.
2. Font, font-weight, and interface-size controls.
3. Sound styles and volume.
4. Optional particles.

Build and check each remaining step separately. See PROGRESS.md for implementation and validation details.
