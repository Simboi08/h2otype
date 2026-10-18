# h2otype

> clicking is apparently the 17th best seated exercise

A minimalist, Apple-inspired typing game with a calm interface and satisfying progression. Built for short timed challenges and endless Zen typing sessions.

## Concept
- **Sprint:** timed 15, 30, or 60 second typing tests, with WPM/accuracy results and local personal bests.
- **Zen:** endless uninterrupted typing, cumulative XP and persistent levels.
- **Progression:** accurate typing earns XP and eventually unlocks levels; restrained, nonblocking feedback.
- **Presentation:** Cupertino-inspired light/dark themes, system theme by default, clean typography and keyboard-first controls.
- **Customizable HUD:** optional live WPM and accuracy, XP progress, and level-up feedback.

## Status
Milestones 0 and 1 are implemented: a React + TypeScript + Vite foundation, persistent light/dark/system appearance, and a working typing engine with character feedback, caret, timer, correction, and restart. Sprint currently uses a fixed 30-second limit; Zen is untimed single-passage practice. Full Sprint features, endless Zen, XP, levels, and configurable live statistics remain for later milestones.

## Development
Use Node.js 20.19+ (20.x) or 22.12+ and npm. Node 24 was used for validation.

```sh
npm ci
npm run dev
```

Vite prints the development server address. For a cloud host, run `npm run dev -- --host 0.0.0.0`.

```sh
npm run build    # TypeScript checks and production bundle
npm run lint     # ESLint checks
npm run preview  # Serve the production bundle after building
```

Tests cover pure typing/scoring logic plus browser navigation, themes, storage fallback, keyboard dismissal, mobile layout, typing/correction, deadline/restart, and composition input:

```sh
npx playwright install chromium
npm test
```

If Chromium is already installed, skip the download and use `CHROMIUM_PATH=/usr/bin/chromium npm test` (adjust the path for your machine). On Linux, Playwright may also require system browser libraries; see its installation output.

In this cloud environment the home npm cache is unwritable. Before npm commands, use `export npm_config_cache=/workspace/.cache/npm` and `mkdir -p "$npm_config_cache"`.

## Foundation decisions
- React handles the small interactive controls; TypeScript catches mismatched values before shipping. Vite supplies fast local development and production builds.
- CSS variables define shared colors, surfaces, borders, and shadows. Changing a theme updates those values together. System fonts avoid external font downloads.
- Appearance defaults to the device setting, follows changes while open, and saves explicit preferences in localStorage. An early script sets colors before React loads to avoid a bright flash; blocked storage falls back safely to a per-visit choice.
- A native dialog provides the appearance panel’s keyboard focus handling and Escape dismissal. Controls have visible focus styles, the layout adapts to narrow screens, and reduced-motion preferences disable transitions.
- A real browser text field handles desktop and mobile text input, while the passage above it displays correct/error states and the current caret. Backspace edits the end of the text; pasting, dropping text, mid-passage edits, and held character keys are blocked. Composition drafts are scored only when committed.
- Timing uses a monotonic clock and an absolute deadline rather than counting interval callbacks, so delayed callbacks do not extend a test. Focus changes and Appearance do not pause a running session. Switching modes discards the current session.
- Gameplay rules live in pure functions, separate from React, so timing and scoring can be tested directly. No backend or progression system has been added.

## Trying the typing engine
Choose Sprint or Zen, click the typing field (or reach it with Tab), and type the passage above it. The first committed character starts time. Correct characters darken; mistakes are colored and underlined. Backspace to fix mistakes. The passage scrolls to keep the caret visible on small screens.

Sprint ends after 30 seconds or at the passage boundary, whichever comes first. Zen currently ends at the passage boundary without a time limit; endless text is Milestone 3. Restart clears the text, timer, and counts and returns focus to the input. WPM and accuracy are hidden while typing and shown in a small readout after finishing; the dedicated Sprint results screen and personal bests belong to Milestone 2.

Scoring conventions:
- WPM = correctly retained characters ÷ 5 ÷ elapsed minutes, rounded to a whole number. Spaces and punctuation count. Zero elapsed time gives 0 WPM.
- Accuracy = correct character attempts ÷ all character attempts, rounded to a percentage. Backspace does not erase previous mistakes; retyping is another attempt. An untouched session defaults to 100% accuracy.
- The incorrect-attempt count includes corrected mistakes. No XP or rewards are awarded yet.

## Stack
React + TypeScript + Vite. For the initial version, use localStorage rather than accounts or a backend.

## Project documents
- [DESIGN.md](DESIGN.md): product and visual specification.
- [ROADMAP.md](ROADMAP.md): staged implementation milestones.
- [PROGRESS.md](PROGRESS.md): current development state and handoff notes.
- [AGENTS.md](AGENTS.md): persistent instructions for Codex.

## Starting work with Codex
1. Open this GitHub repository in Codex.
2. Ask Codex to read README.md, DESIGN.md, ROADMAP.md, PROGRESS.md and AGENTS.md.
3. Start **Milestone 2 only** and request tested changes and a PROGRESS.md update.

Keep changes small and review them before merging.
