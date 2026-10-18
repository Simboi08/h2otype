# Codex instructions — h2otype

Read README.md, DESIGN.md, ROADMAP.md and PROGRESS.md before making changes.

## Product intent
Build a minimalist Apple-inspired typing game: calm on the surface, with rewarding XP and level progression. Two modes: Sprint (15/30/60-second tests) and Zen (endless typing). The default interface is distraction-free, with live statistics configurable in Settings.

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
