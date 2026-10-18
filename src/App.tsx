import { useEffect, useRef, useState } from "react";
import TypingPractice from "./TypingPractice";
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
            onClick={() => setMode("sprint")}
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
        <section className="typing-space" aria-labelledby="mode-title">
          <div className="eyebrow">
            <span className="status-dot" /> A LITTLE SPACE TO FOCUS
          </div>
          <h1 id="mode-title">
            {mode === "sprint" ? "Find your flow." : "Take your time."}
          </h1>
          <p className="intro">
            {mode === "sprint"
              ? "A few words. A clear mind. One moment at a time."
              : "No clock to chase. Just you and the words ahead."}
          </p>

          <TypingPractice key={mode} mode={mode} />
          <p className="mode-note" aria-live="polite">
            {mode === "sprint"
              ? "Make a little time for a little progress."
              : "Stay a while. There’s nowhere else to be."}
          </p>
        </section>

        <section className="coming-next" aria-label="What’s ahead">
          <div className="feature">
            <svg
              className="feature-symbol"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m5 18 13-13M7 5h11v11" />
            </svg>
            <div>
              <h2>A pace for every day</h2>
              <p>Quick Sprints or open-ended Zen.</p>
            </div>
          </div>
          <div className="feature">
            <svg
              className="feature-symbol"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
            </svg>
            <div>
              <h2>Small steps add up</h2>
              <p>XP and levels, coming as you grow.</p>
            </div>
          </div>
          <div className="feature">
            <svg
              className="feature-symbol"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 7c6-5 12 5 18 0M3 12c6-5 12 5 18 0M3 17c6-5 12 5 18 0" />
            </svg>
            <div>
              <h2>Less noise. More focus.</h2>
              <p>Your statistics, on your terms.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>A quieter kind of typing.</span>
        <span className="foundation-label">
          h2otype <span aria-hidden="true">·</span> Typing practice
        </span>
      </footer>

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
            <p className="eyebrow">MAKE YOURSELF AT HOME</p>
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
        <p className="dialog-description">
          A little light, a little dark. Whatever feels right.
        </p>
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
