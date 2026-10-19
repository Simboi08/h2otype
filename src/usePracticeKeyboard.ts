import { useEffect } from "react";
import type { RefObject } from "react";

type Options = {
  restart: () => void;
  composing: RefObject<boolean>;
  input: RefObject<HTMLInputElement | null>;
  enabled: boolean;
};

export function usePracticeKeyboard({
  restart,
  composing,
  input,
  enabled,
}: Options) {
  useEffect(() => {
    if (enabled && !document.querySelector("dialog[open]"))
      input.current?.focus({ preventScroll: true });
  }, [enabled, input]);

  useEffect(() => {
    const focusInput = () => input.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]"))
        return;
      // Keep browser/OS shortcuts intact. Tab alone belongs to the game.
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === "Tab") {
        // Even Shift+Tab, repeats, and composition must not move focus around
        // the page. Only a fresh, unmodified Tab starts a new session.
        event.preventDefault();
        if (composing.current || event.isComposing) return;
        if (event.shiftKey || event.repeat) {
          if (enabled) focusInput();
        } else restart();
        return;
      }
      if (!enabled || composing.current || event.isComposing) return;
      if (
        [...event.key].length === 1 ||
        event.key === "Dead" ||
        event.key === "Process"
      ) {
        if (event.repeat) {
          event.preventDefault();
          return;
        }
        // Focus before the browser inserts text. The original key still goes
        // through the real input/onChange path, including its first character.
        focusInput();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!enabled || document.querySelector("dialog[open]")) return;
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target.closest(
          "button, a, input, select, textarea, [contenteditable], dialog",
        )
      )
        return;
      if (window.getSelection()?.isCollapsed === false) return;
      focusInput();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
    };
  }, [restart, composing, input, enabled]);
}
