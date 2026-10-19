import type { KeyboardEvent } from "react";

export function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >("button:not([disabled]), input:not([disabled]), select:not([disabled])"),
  ).filter((control) => control.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus({ preventScroll: true });
  }
}
