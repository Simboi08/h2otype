import { useEffect, useRef, useState } from "react";
import ZenPractice from "./ZenPractice";
import TypingPractice from "./TypingPractice";
import type { SprintDuration } from "./sprintRecords";
import { useTheme } from "./useTheme";

function AppearanceIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState<"sprint" | "zen">("sprint");
  const [duration, setDuration] = useState<SprintDuration>(30);
  const [zenExitRequested, setZenExitRequested] = useState(false);
  const [focusPractice, setFocusPractice] = useState(false);
  const { theme, setTheme } = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const appearanceButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const restoreFocus = () => appearanceButton.current?.focus();
    element.addEventListener("close", restoreFocus);
    return () => element.removeEventListener("close", restoreFocus);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <a className="wordmark" href="./" aria-label="h2otype home">
          h<span className="wordmark-two">2</span>otype
          <span className="brand-dot" />
        </a>
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
          aria-label="Open appearance settings"
          aria-haspopup="dialog"
        >
          <AppearanceIcon />
          <span>Appearance</span>
        </button>
      </header>

      <main id="main" tabIndex={-1}>
        <section
          className="typing-space"
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
              focusOnMount={focusPractice}
              onDurationChange={(value) => {
                setFocusPractice(true);
                setDuration(value);
              }}
            />
          )}
        </section>
      </main>

      <dialog
        ref={dialog}
        className="settings-dialog"
        aria-labelledby="appearance-title"
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
            <h2 id="appearance-title">Appearance</h2>
          </div>
          <button
            className="close-button"
            onClick={() => dialog.current?.close()}
            aria-label="Close appearance settings"
          >
            ×
          </button>
        </div>
        <p className="dialog-description">Choose a color theme.</p>
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
          System follows your device’s appearance. Your choice is saved on this
          device.
        </p>
      </dialog>
    </div>
  );
}
