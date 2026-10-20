# Particle compatibility diagnostic — 2026-10-20

The reported device is **iPad, Chrome, onscreen keyboard**. Typing works, but its particles were absent. Chrome on iPad generally uses WebKit; a desktop Chrome test does not establish iPad compatibility.

## Findings and changes

- The previous visibility guard rejected a character whenever any part lay outside the passage window. Fractional font layout and a short keyboard viewport can leave a visible letter partially clipped. A regression now recreates that geometry and checks actual canvas pixels. Only wholly hidden letters are rejected.
- The old canvas assumed its CSS rectangle always matched `innerWidth`/`innerHeight` and lived inside an isolated game panel. It now renders directly under `body`, uses its own measured rectangle for bitmap size and local emission coordinates, and handles `visualViewport.resize`. Clearing covers the complete bitmap at every scale. Density, sprite size, right-facing angles and finite lifetimes remain bounded.
- Reduce Motion, saved Particles Off and Visual effects Off intentionally suppress particles. Settings → Typing particles now identifies each reason, reports renderer readiness or canvas failure, and keeps typing/scoring operational when drawing is unavailable.
- No user-agent detection or mobile-specific effects disablement exists. Low quality still draws fewer particles at 30fps; Medium/High use available animation frames. This does not promise a particular refresh rate on real hardware.

These are verified rendering weaknesses and defensive fixes. **The exact cause on the reported iPad is not confirmed** without testing that device and its preferences.

## Coverage

| Environment | Status | Coverage |
| --- | --- | --- |
| Installed Linux Chromium | Automated | Visible canvas pixels, normal/composition input, fractional clipping, viewport changes, reduced motion, unavailable drawing, cleanup and existing particle budgets. |
| Chromium with touch/iPad-size device emulation | Automated compatibility project | Same input/drawing checks at tablet device scale, keyboard-sized windows and portrait/landscape dimensions. This is not real WebKit or an actual mobile keyboard. |
| WebKit tablet project | Available, not executed here | Browser download rejected with HTTP 403 by this environment's proxy, including the escalated retry. |
| Real iPad Chrome/onscreen keyboard | User verification required | Device-specific keyboard animation, compositing, zoom and accessibility preferences. |
| Firefox / physical high-refresh devices | Not tested | No performance or compatibility claim. |

Run the tablet Chromium diagnostic with the installed browser:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm test -- --config=playwright.compatibility.config.ts --project=chromium-tablet --workers=2
```

On a machine that can download WebKit:

```sh
npx playwright install webkit
npm test -- --config=playwright.compatibility.config.ts --project=webkit-tablet
```

## Checking the real iPad after deployment

1. Open the latest deployment in Chrome and open Settings → Typing particles. Note its status message. Preserve any intentional mute/Low/motion choices.
2. If it reports device reduced motion, inspect iPad Settings → Accessibility → Motion → Reduce Motion. The game respects that device preference.
3. With particles enabled and Visual effects above Off, close Settings, tap the typing input and type correct letters using the onscreen keyboard. Check portrait and landscape, then continue across a line wrap.
4. Open/close the keyboard and retry, then restart. If drawing is still absent while the status says ready, record the iPadOS/Chrome versions, orientation and status message. A screen recording of the caret and keyboard transition would help diagnose the remaining device-specific behavior.

No analytics, device fingerprinting, remote assets or new application dependencies were added.
