import { expect, test } from "./practice-fixture";

test("wrapped passage lines start at the same left edge", async ({ page }) => {
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    await page.getByRole("button", { name: "30s", exact: true }).click();
    const lines = await page.locator(".passage").evaluate((passage) => {
      const leftByLine = new Map<number, number>();
      for (const character of passage.querySelectorAll(".character")) {
        if (!character.textContent?.trim()) continue;
        const rect = character.getBoundingClientRect();
        const top = Math.round(rect.top);
        leftByLine.set(
          top,
          Math.min(leftByLine.get(top) ?? Infinity, rect.left),
        );
      }
      return [...leftByLine.values()];
    });
    expect(lines.length).toBeGreaterThan(1);
    expect(Math.max(...lines) - Math.min(...lines)).toBeLessThan(1);
  }
});
