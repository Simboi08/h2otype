import type { Page } from "@playwright/test";

export async function setGraphicsQuality(
  page: Page,
  tier: "low" | "medium" | "high",
) {
  const slider = page.getByRole("slider", {
    name: "Graphics quality",
    exact: true,
  });
  await slider.press("Home");
  for (let index = 0; index < ["low", "medium", "high"].indexOf(tier); index++)
    await slider.press("ArrowRight");
}

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
