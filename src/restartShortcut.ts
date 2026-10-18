import type { KeyboardEvent } from "react";

// Scope this shortcut to the typing input and focused summary headings.
// Shift+Tab remains available to leave the field and reach other controls.
export function restartOnTab(
  event: KeyboardEvent<HTMLElement>,
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
    event.nativeEvent.isComposing
  )
    return;
  event.preventDefault();
  if (!event.repeat) restart();
}
