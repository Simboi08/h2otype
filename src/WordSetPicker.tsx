import { useEffect, useRef } from "react";
import { wordSets } from "./wordBank";
import type { WordSet } from "./wordBank";
import { trapDialogFocus } from "./dialogFocus";

export default function WordSetPicker({
  value,
  disabled = false,
  onChange,
  storageAvailable,
}: {
  value: WordSet;
  disabled?: boolean;
  onChange: (set: WordSet) => void;
  storageAvailable: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (
        disabled ||
        event.key !== "F3" ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      dialog.current?.showModal();
    };
    window.addEventListener("keydown", open);
    return () => window.removeEventListener("keydown", open);
  }, [disabled]);
  return (
    <>
      <button
        className="appearance-button wordset-button"
        disabled={disabled}
        ref={button}
        onClick={() => dialog.current?.showModal()}
        aria-label="Choose word set"
        aria-haspopup="dialog"
        aria-keyshortcuts="F3"
        title={
          disabled
            ? "Daily uses English 100 for everyone"
            : `${wordSets.find((set) => set.id === value)!.label} (F3)`
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M3 18 8 5h2l5 13M5 13h8M16 8h6M19 5v3c0 5-2 8-5 10m2-7c1 3 3 5 6 7" />
        </svg>
        <span>{wordSets.find((set) => set.id === value)!.label}</span>
      </button>
      <dialog
        className="settings-dialog wordset-dialog"
        ref={dialog}
        aria-labelledby="wordset-title"
        onKeyDown={trapDialogFocus}
        onClose={() => {
          (
            document.querySelector<HTMLElement>(
              ".typing-input:not([readonly]), .sprint-results h2",
            ) ?? button.current
          )?.focus({ preventScroll: true });
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
          <h2 id="wordset-title">Word sets</h2>
          <button
            className="close-button"
            aria-label="Close word sets"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p className="settings-note">
          English · choose the words you practice.
        </p>
        <div
          className="wordset-options"
          role="group"
          aria-label="English word sets"
        >
          {wordSets.map((set) => (
            <button
              className="wordset-option"
              key={set.id}
              aria-pressed={value === set.id}
              onClick={() => {
                onChange(set.id);
                dialog.current?.close();
              }}
            >
              <strong>{set.label}</strong>
              <span>{set.description}</span>
            </button>
          ))}
        </div>
        <p className="settings-note">
          Changing sets starts a fresh run in both modes. XP and personal bests
          stay saved.
        </p>
        {!storageAvailable && (
          <p className="settings-storage-note" role="status">
            This word choice works for this visit, but cannot be saved.
          </p>
        )}
      </dialog>
    </>
  );
}
