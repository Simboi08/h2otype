# Codex instructions — h2otype

Read README.md, DESIGN.md, ROADMAP.md and PROGRESS.md before making changes.

## Product intent
Build a focused pixel-arcade typing game with rewarding XP and level progression. The user-requested arcade refresh in DESIGN.md supersedes the original Apple-inspired styling. Modes: Sprint (15/30/60-second tests), Zen (endless typing), and Daily (shared UTC passage, 15 seconds). Keep the passage central, graphics configurable, and live statistics optional in Settings. New visits start Sprint 15s, High graphics, shake on, and 8-bit sound/particles; preserve returning players' saved settings. Keep the active line at the top with upcoming lines visible.

Prioritize fun, satisfying game feedback: stronger effects default on, with clear controls for intensity and screen shake. Keep text readable and respect reduced motion. Use combo-driven edge vignettes with a transparent center; do not restore flame sprites. Avoid always-on full-screen scanline/filter overlays and extra confirmation steps when switching modes.

## Development guidelines
- Use React, TypeScript, and Vite unless existing code establishes another stack.
- Work in small, testable milestones. Do not implement the entire roadmap in one task.
- Prioritize accessible, responsive, keyboard-first interactions and smooth performance.
- Use clean, intentional animation; respect prefers-reduced-motion.
- Support light, dark, and system theme, defaulting to system.
- Keep gameplay calculations and word generation in pure, independently testable functions. Preserve generator state when resuming Zen and keep best scores separate by word set and duration.
- First-correct positions earn base XP plus capped combo bonuses; keep reward calculation independent of visual/audio preferences, carry fractional bonus tenths, and prevent correction/key-repeat farming. Decay combo charge by active elapsed time, faster at higher tiers, using the same pure integration in gameplay and Daily replay; never deduct earned rewards. Shake only at combo tier gains.
- Persist settings, XP and records locally. Daily supports an optional Supabase guest leaderboard through private server handlers; keep it optional and never put service credentials in the browser. No accounts are required. Keep Leaderboard accessible before playing. Highlight it when a Daily is ready for voluntary name/automatic-update opt-in; never open the dialog automatically. Publish better runs automatically after consent. Submission tokens/edit traces must survive mode changes in memory; preserve local play and actionable retry errors.
- Use .js runtime import specifiers in the API/scoring dependency graph to match Vercel output. Keep `npm run check:api` in production builds; source TypeScript import tests do not verify deployed packaging.
- Explain major changes in beginner-friendly terms and document important tradeoffs.
- Update PROGRESS.md after each milestone: completed, tested, known issues, next task.
- Do not override DESIGN.md product decisions without recording the change.
