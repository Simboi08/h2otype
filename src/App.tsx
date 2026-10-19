import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import CustomizationSettings from "./CustomizationSettings";
import PreferenceSlider from "./PreferenceSlider";
import ProgressIndicator from "./ProgressIndicator";
import ZenPractice from "./ZenPractice";
import TypingPractice from "./TypingPractice";
import type { SprintDuration } from "./sprintRecords";
import {
  setPreference,
  usePreferences,
  wpmRefreshOptions,
  typingFonts,
} from "./preferences";
import type { BooleanPreferenceKey } from "./preferences";
import { useTheme } from "./useTheme";

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="8" cy="6" r="2" fill="var(--background)" />
      <circle cx="16" cy="12" r="2" fill="var(--background)" />
      <circle cx="10" cy="18" r="2" fill="var(--background)" />
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState<"sprint" | "zen">("sprint");
  const [duration, setDuration] = useState<SprintDuration>(30);
  const [zenExitRequested, setZenExitRequested] = useState(false);
  const { preferences, storageAvailable } = usePreferences();
  const {
    theme,
    setTheme,
    storageAvailable: themeStorageAvailable,
  } = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const appearanceButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const restoreFocus = () => {
      const target =
        document.querySelector<HTMLElement>(
          ".typing-input:not([readonly]), .sprint-results h2",
        ) ?? appearanceButton.current;
      target?.focus({ preventScroll: true });
    };
    const openWithKeyboard = (event: KeyboardEvent) => {
      if (
        event.key !== "F2" ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      event.preventDefault();
      if (!event.repeat && !element.open) element.showModal();
    };
    element.addEventListener("close", restoreFocus);
    window.addEventListener("keydown", openWithKeyboard);
    return () => {
      element.removeEventListener("close", restoreFocus);
      window.removeEventListener("keydown", openWithKeyboard);
    };
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="brand-group">
          <a className="wordmark" href="./" aria-label="h2otype home">
            h<span className="wordmark-two">2</span>otype
            <span className="brand-dot" />
          </a>
          <ProgressIndicator />
        </div>
        <nav className="mode-switch" aria-label="Typing mode">
          <button
            aria-pressed={mode === "sprint"}
            onClick={() => {
              if (mode === "zen") setZenExitRequested(true);
              else setMode("sprint");
            }}
          >
            Sprint
          </button>
          <button aria-pressed={mode === "zen"} onClick={() => setMode("zen")}>
            Zen
          </button>
        </nav>
        <button
          className="appearance-button"
          ref={appearanceButton}
          onClick={() => dialog.current?.showModal()}
          aria-label="Open settings"
          aria-haspopup="dialog"
          aria-keyshortcuts="F2"
          title="Settings (F2)"
        >
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </header>

      <main id="main" tabIndex={-1}>
        <section
          className="typing-space"
          style={
            {
              "--typing-font": typingFonts.find(
                (font) => font.value === preferences.typingFont,
              )!.family,
              "--typing-weight": preferences.typingWeight,
              "--typing-scale": preferences.typingScale / 100,
            } as CSSProperties
          }
          aria-label={`${mode === "sprint" ? "Sprint" : "Zen"} typing practice`}
        >
          <h1 className="sr-only">h2otype typing practice</h1>
          {mode === "zen" ? (
            <ZenPractice
              exitRequested={zenExitRequested}
              onCancelExit={() => setZenExitRequested(false)}
              onExit={() => {
                setZenExitRequested(false);
                setMode("sprint");
              }}
            />
          ) : (
            <TypingPractice
              key={`${mode}-${duration}`}
              mode={mode}
              duration={duration}
              onDurationChange={setDuration}
            />
          )}
        </section>
      </main>

      <dialog
        ref={dialog}
        className="settings-dialog"
        aria-labelledby="settings-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<
              HTMLButtonElement | HTMLInputElement | HTMLSelectElement
            >(
              "button:not([disabled]), input:not([disabled]), select:not([disabled])",
            ),
          ).filter((control) => control.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus({ preventScroll: true });
          }
        }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.target === event.currentTarget &&
            (event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom)
          )
            dialog.current?.close();
        }}
      >
        <div className="dialog-heading">
          <div>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            className="close-button"
            onClick={() => dialog.current?.close()}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <h3 className="settings-section-title">Appearance</h3>
        <fieldset className="theme-options">
          <legend className="sr-only">Color theme</legend>
          {(["light", "dark", "system"] as const).map((option) => (
            <label key={option} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              <span
                className={`theme-swatch swatch-${option}`}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </span>
              <span>{option[0].toUpperCase() + option.slice(1)}</span>
            </label>
          ))}
        </fieldset>
        <p className="settings-note">
          System follows your device’s appearance.
        </p>
        <CustomizationSettings />
        <fieldset className="preference-options">
          <legend>While typing</legend>
          <PreferenceSlider
            label="WPM refresh rate"
            description="How often live WPM changes. Results stay exact."
            min={0}
            max={3}
            step={1}
            value={wpmRefreshOptions.findIndex(
              (option) => option.value === preferences.wpmRefreshMs,
            )}
            valueText={
              wpmRefreshOptions.find(
                (option) => option.value === preferences.wpmRefreshMs,
              )!.label
            }
            endpoints={["Instant", "2 seconds"]}
            onChange={(index) =>
              setPreference("wpmRefreshMs", wpmRefreshOptions[index].value)
            }
          />
          {(
            [
              ["liveWpm", "Live WPM", "Show your current typing speed."],
              ["liveAccuracy", "Live accuracy", "Show accuracy as you type."],
              [
                "xpProgress",
                "XP progress",
                "Show your level and progress bar.",
              ],
              [
                "levelNotifications",
                "Level-up notifications",
                "Show a brief notice when you level up.",
              ],
            ] satisfies [BooleanPreferenceKey, string, string][]
          ).map(([key, label, description]) => (
            <label className="preference-row" key={key}>
              <span>
                <span className="preference-label" id={`${key}-label`}>
                  {label}
                </span>
                <span
                  className="preference-description"
                  id={`${key}-description`}
                >
                  {description}
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={preferences[key]}
                onChange={(event) =>
                  setPreference(key, event.currentTarget.checked)
                }
                aria-labelledby={`${key}-label`}
                aria-describedby={`${key}-description`}
              />
            </label>
          ))}
        </fieldset>
        <p className="settings-note">
          Display preferences apply to both modes. XP keeps accruing when its
          indicator is hidden.
        </p>
        <p className="settings-note">
          Tab restarts anywhere on the game page. In Zen it clears the draft;
          earned XP stays. Shift+Tab stays in typing. F2 opens Settings, where
          Tab and Shift+Tab navigate normally. Escape closes Settings and
          returns to typing or your summary.
        </p>
        {(!storageAvailable || !themeStorageAvailable) && (
          <p className="settings-storage-note" role="status">
            Preferences apply for this visit, but cannot be saved in this
            browser.
          </p>
        )}
      </dialog>
    </div>
  );
}
