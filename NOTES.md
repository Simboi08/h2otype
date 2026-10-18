# h2otype — Ideas and feedback

Captured: 2026-10-18. Tab restart and WPM refresh controls are implemented; the remaining ideas are for later updates.

## Controls
- [x] Quick restart with **Tab**.
- [x] Stop Tab from cycling through every element during typing. Tab restarts from the input or focused summary heading; Shift+Tab leaves the field. Settings and other controls retain normal navigation.
- [x] Apply restart consistently to Sprint and Zen, return focus to typing, and retain lifetime XP and personal bests. Settings explains that restarting Zen clears its resumable draft.

## Typing appearance
- Add a menu for choosing the typing font and adjusting the size of the typing interface.
- Keep the passage aligned and centered, including on phones and short screens. Font and size changes should preserve the current session.

## Live statistics
- [x] Let the user choose how often the WPM counter refreshes: Instant, 0.5 seconds (default), 1 second, or 2 seconds. Persist the choice in Settings.
- [x] Change only how often the number is displayed. Keep timing, scoring, XP, and final results accurate and independent of this setting.

## Sound
- Add typing sound effects, with standard and bitcrushed/8-bit styles.
- Provide an Off option and volume control in Settings. Avoid overlapping sounds building up during fast typing.

## Particle effects — later
- Small spurts of particles from the correctly typed letter, with pixel/8-bit and regular styles.
- Add Settings controls later. Keep effects optional and restrained, respect reduced motion, and preserve typing responsiveness.

## Suggested order
1. Tab restart and configurable WPM refresh rate — implemented.
2. Font and interface-size controls.
3. Sound styles and volume.
4. Optional particles.

Build and check each remaining step separately. See PROGRESS.md for implementation and validation details.
