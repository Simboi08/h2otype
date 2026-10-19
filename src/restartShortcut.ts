import { useEffect } from "react";
import type { RefObject } from "react";

function restartOnTab(
  event: KeyboardEvent,
  restart: () => void,
  composing = false,
) {
  if (
    event.key !== "Tab" ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    composing ||
    event.isComposing
  )
    return;
  event.preventDefault();
  if (!event.repeat) restart();
}

// Each mounted mode owns one page-level shortcut, including while its results
// are visible. Settings retains normal Tab behavior; Shift+Tab navigates the page.
export function useRestartShortcut(
  restart: () => void,
  composing: RefObject<boolean>,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]"))
        return;
      restartOnTab(event, restart, composing.current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [restart, composing]);
}
