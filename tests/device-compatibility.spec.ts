import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-20T12:01:00Z"));
  await page.goto("/");
  await expect(page.locator(".typing-particles")).toHaveAttribute(
    "data-renderer",
    "ready",
  );
}
async function ink(page: Page) {
  await page.clock.runFor(32);
  return page
    .locator(".typing-particles")
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.some((value, i) => i % 4 === 3 && value > 0),
    );
}
async function nativeLetter(page: Page, char: string) {
  await page
    .locator(".typing-input")
    .evaluate((input: HTMLInputElement, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, input.value + value);
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: value,
          inputType: "insertText",
        }),
      );
    }, char);
}

test("native tablet input draws visible particles after keyboard resize and rotation in both modes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  for (const mode of ["Sprint", "Zen"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    for (const viewport of [
      { width: 1024, height: 440 },
      { width: 768, height: 650 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() =>
        visualViewport?.dispatchEvent(new Event("resize")),
      );
      const char = (await page.locator(".character.current").textContent())!;
      await nativeLetter(page, char);
      expect(await ink(page)).toBe(true);
      await expect(page.locator(".typing-particles")).toHaveCSS(
        "pointer-events",
        "none",
      );
      expect(
        await page
          .locator(".typing-particles")
          .evaluate((canvas) => canvas.parentElement === document.body),
      ).toBe(true);
      await page.clock.runFor(600);
      expect(await ink(page)).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});

test("fractionally clipped visible letters still emit particles", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const letter = document.querySelector<HTMLElement>(".character")!;
    const viewport = document
      .querySelector(".passage-window")!
      .getBoundingClientRect();
    const shift = letter.getBoundingClientRect().top - viewport.top + 0.5;
    document.querySelectorAll<HTMLElement>(".passage-word").forEach((word) => {
      word.style.position = "relative";
      word.style.top = `${-shift}px`;
    });
  });
  await nativeLetter(
    page,
    (await page.locator(".character.current").textContent())!,
  );
  expect(await ink(page)).toBe(true);
});

test("composition commits draw once and reduced motion explains suppressed particles", async ({
  page,
}) => {
  await ready(page);
  const input = page.locator(".typing-input");
  const char = (await page.locator(".character.current").textContent())!;
  await input.dispatchEvent("compositionstart");
  await nativeLetter(page, char);
  expect(await ink(page)).toBe(false);
  await input.dispatchEvent("compositionend", { data: char });
  expect(await ink(page)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await expect(page.locator(".particle-status")).toContainText(
    "your device requests reduced motion",
  );
  await expect(page.locator(".typing-particles")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".particle-status")).toContainText(
    "renderer ready",
  );
});

test("unavailable canvas reports a useful diagnosis without breaking typing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await page.locator(".typing-input").press("a");
  await expect(page.locator(".typing-input")).toHaveValue("a");
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await expect(page.locator(".particle-status")).toContainText(
    "drawing is unavailable",
  );
});
