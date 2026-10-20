# h2otype — Ideas and feedback

Captured: 2026-10-18. All currently requested controls, customization, and word-set changes are implemented.

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

## Arcade feel and combos — latest feedback
- [x] Character-spacing slider for the passage and input.
- [x] More punch in the 8-bit crunch: stronger low end/transient and fuller 95ms body.
- [x] Larger pixel particles (6px), with fewer per burst and lower total caps for readability.
- [x] Grander level-up banner, expanding ring, and pixel burst; static alternative for Low/reduced motion.
- [x] Graphics quality as a Low/Medium/High slider.
- [x] Independent sliders for live WPM and accuracy sizes.
- [x] Correct-typing streaks with a combo meter, escalating fire, and progressively higher sound pitch. Feedback only; XP rules stay unchanged.

## Later — explicitly deferred
- [ ] Achievements.
- [ ] Unlockable themes.

## Game feedback and navigation — latest feedback
- [x] Level announcement has a fast scale-up and matching fast scale-down exit, rather than disappearing abruptly.
- [x] Clicking Sprint at the top switches directly without a confirmation button; Zen progress stays saved for later Resume.
- [x] Punchier fire beyond the small meter, with large edge flames and bounded embers.
- [x] Small screen-shake pulses on by default at combo milestones, with an independent Off switch.
- [x] Visual effects intensity slider: Off / Balanced / Intense, default Intense, while respecting Low graphics and reduced motion.
- [x] Remove the screen-wide filter/scanlines and celebration tint.
- Product direction: make h2otype fun and satisfying as a game while keeping typing readable. Strong earned feedback and clear effect preferences are part of that identity.
- Planning can happen in this Codex chat or a separate brainstorming chat. Keep agreed decisions and future tester feedback here, then record implementation choices in DESIGN.md and completed/verified work in PROGRESS.md.

## Word sets and effects — latest feedback
- [x] Larger common-English word bank: English 100, 500, and 1,000, plus original sentences.
- [x] Word-set button next to Settings, remembered across visits, with F3 access.
- [x] Preserve earned XP, existing sentence drafts, and separate personal bests when selecting sets.
- [x] Remove the fire sprites and meter flames; use an earned, tier-scaled edge vignette with a clear center.
- [x] Stronger and more frequent Intense shake, while Balanced/Off, Low graphics, reduced motion, and the independent shake switch remain effective.
- Other languages and additional text packs can follow later; achievements and unlockable themes remain deferred.

## Results, combo rewards, and Daily — latest notes
- [x] Standard/8-bit completion phrases respecting sound Off and volume.
- [x] Shake at tier upgrades only; remove intermediate milestone pulses.
- [x] Better results: WPM/accuracy emphasis, highest combo, base/bonus/total XP.
- [x] Combo bonuses affect earned XP, capped at 3× without correction farming.
- [x] Daily challenges use common text/time and rank by combo-weighted points.
- [x] Public playtest instructions for Vercel and Cloudflare; no domain purchase required.
- [x] Shared leaderboard code and private Supabase schema prepared.
- [ ] Connect a real Supabase project and verify the hosted leaderboard.
- Achievements/themes remain deferred. Publishing is a separate step; this coding task does not create a hosted site.

See PROGRESS.md for implementation and validation details. Add new feedback here as it comes up.

## Finish celebrations and harder combos
- [x] Brief finish confetti, including explicit nonempty Zen Finish.
- [x] Light edge bursts at combo tier gains, following graphics/effects controls.
- [x] Harder 25/60/120/200/350-character tiers, rewarding up to 3× XP and Daily points.
- [x] Preserve saved XP and separate Daily scoring versions.
- Next: collect playtest feedback on difficulty and effects. Supabase activation, achievements and unlockable themes remain deferred.

## Reading flow and defaults — 2026-10-20
- [x] Default landing mode: Sprint 15s.
- [x] Consistent pixel interface typography, with a saved typing-font override.
- [x] Scroll on every completed line to expose the next lines; four-line view when space permits.
- [x] Independent scroll and caret speed sliders, including Instant.
- [x] More finish confetti with a persistent Off–200% amount slider.
- [x] New players: High graphics, shake on, 8-bit crush sound and 8-bit particles; keep saved returning-player choices.
- [x] Medium/High particles follow display frames and move without grid snapping; Low retains 30fps.
- [x] Daily temporarily becomes a shared 15s Sprint, with older scoring versions kept separate.

## Future ideas — do not implement yet
- [ ] Racing: everyone types the same passage, each player has a distinct caret color, a versus lineup introduces players/colors, a short passage preview appears first, and the remaining text is revealed when the race begins.
- [ ] Each Sprint duration (15s/30s/60s) gets its own Daily passage.
- [ ] Unlockable caret styles.
- [ ] Earned in-game currency and a randomized pet-unlock system; economy and reward rules still need planning.
- Achievements and unlockable themes remain deferred. Supabase activation remains deferred until requested.

## Caret, celebration and Daily reminder — 2026-10-19
- [x] Blink the caret only before typing; keep it solid for the rest of the run, including after deleting text.
- [x] More finish confetti: 2.5× the pieces, larger/wider/longer bursts, preserving the amount slider and effects settings.
- [x] Compact Daily availability/today's-best display beneath the logo, with direct challenge access and UTC rollover.
- [x] Supabase guest leaderboard implementation/setup guide (requested for activation below).
- [ ] Verify the real hosted database connection after user configuration.

## Perimeter confetti, combo decay and Supabase — 2026-10-20
- [x] Move finish sprays away from the upper corners: full-height side coverage plus smaller top/bottom bursts.
- [x] Combo steadily drains, with faster decay at higher tiers; fresh correct typing refills it. Already earned XP/points remain safe.
- [x] Connect Daily through the private Supabase REST adapter, with guest identities and server replay; document SQL and Vercel setup first.
- [x] Start online run tokens on first typing and isolate new decay-based scores as Daily rules 4.
- [ ] User finishes SQL/environment setup and verifies a real hosted submission. Never share service keys in chat.

## Leaderboard discoverability and publishing — 2026-10-20
- [x] View the leaderboard without finishing a Daily first.
- [x] Prompt for the first qualifying online Daily score; remember the display name.
- [x] Automatically update a guest's entry on better runs for the rest of the UTC day.
- [x] Keep rank visible until the next Daily; show own rank beyond the top 50.
- [x] Fix native API startup imports and show actionable submission errors/retry.
- [ ] Verify the live Vercel API after the user deploys the update.

## Tablet particles, combo clarity and Daily invitation — 2026-10-20
- [x] Diagnose per-letter particles with tablet input/resize coverage and an explicit Settings status. Harden fractional visibility, viewport coordinates and canvas placement.
- [ ] Verify on the user's real iPad Chrome with its onscreen keyboard; WebKit download is blocked in this environment.
- [x] Faster tier-dependent combo decay with linear meter animation; building and empty states remain visible through idle expiry.
- [x] Per-tier fill targets and full-bar upgrade acknowledgement, retaining shared scoring and earned XP.
- [x] Pulse the Leaderboard button after a ready Daily instead of automatically opening the submission dialog. Respect Low/Off/reduced motion.
- Deployment: rerun updated `supabase/daily.sql` before rules-5 deployment. Preserve old scores and server settings.
