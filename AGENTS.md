# Codex instructions — h2otype

Read README.md, DESIGN.md, ROADMAP.md and PROGRESS.md before making changes.

## Product intent
Build a focused pixel-arcade typing game with rewarding XP and level progression. The user-requested arcade refresh in DESIGN.md supersedes the original Apple-inspired styling. Two modes: Sprint (15/30/60-second tests) and Zen (endless typing). Keep the passage central, graphics configurable, and live statistics optional in Settings.

Prioritize fun, satisfying game feedback: stronger effects default on, with clear controls for intensity and screen shake. Keep text readable and respect reduced motion. Avoid full-screen scanline/filter overlays and extra confirmation steps when switching modes.

## Development guidelines
- Use React, TypeScript, and Vite unless existing code establishes another stack.
- Work in small, testable milestones. Do not implement the entire roadmap in one task.
- Prioritize accessible, responsive, keyboard-first interactions and smooth performance.
- Use clean, intentional animation; respect prefers-reduced-motion.
- Support light, dark, and system theme, defaulting to system.
- Keep gameplay calculations in pure, independently testable functions.
- Correct typing earns XP; prevent holding a key or repeated incorrect keystrokes from farming XP.
- Persist settings, XP and best scores in localStorage for MVP; no accounts or backend.
- Explain major changes in beginner-friendly terms and document important tradeoffs.
- Update PROGRESS.md after each milestone: completed, tested, known issues, next task.
- Do not override DESIGN.md product decisions without recording the change.
