import type { Page } from "@playwright/test";

export async function setWpmRefresh(page: Page, milliseconds: number) {
  const slider = page.getByRole("slider", {
    name: "WPM refresh rate",
    exact: true,
  });
  await slider.focus();
  await slider.press("Home");
  const index = [0, 500, 1000, 2000].indexOf(milliseconds);
  if (index < 0) throw new Error("Unsupported WPM interval");
  for (let step = 0; step < index; step++) await slider.press("ArrowRight");
}
