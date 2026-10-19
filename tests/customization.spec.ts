import { expect, test } from "./practice-fixture";
import { defaultPreferences, parsePreferences } from "../src/preferences";

test("customization preferences validate old, partial, and malformed saves independently", () => {
  const parse = (preferences: Record<string, unknown>) =>
    parsePreferences(JSON.stringify({ version: 1, preferences }));
  expect(parse({ liveWpm: true, wpmRefreshMs: 2000 })).toEqual({
    ...defaultPreferences,
    liveWpm: true,
    wpmRefreshMs: 2000,
  });
  const valid = {
    typingFont: "serif",
    typingWeight: 700,
    typingScale: 130,
    soundStyle: "bitcrush",
    soundVolume: 100,
    particleStyle: "pixel",
  };
  expect(parse(valid)).toEqual({ ...defaultPreferences, ...valid });
  for (const invalid of [
    {
      typingFont: "remote",
      typingWeight: 450,
      typingScale: 200,
      soundStyle: "invalid",
      soundVolume: -1,
      particleStyle: "fire",
    },
    {
      typingFont: {},
      typingWeight: "700",
      typingScale: 95,
      soundStyle: true,
      soundVolume: 99,
      particleStyle: null,
    },
  ])
    expect(parse(invalid)).toEqual(defaultPreferences);
});

test("font, weight, and size apply to both modes without clearing progress and survive reload", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.pressSequentially("slow");
  await page.keyboard.press("F2");
  await page
    .getByRole("combobox", { name: "Typing font" })
    .selectOption("serif");
  await page.getByRole("slider", { name: "Font weight" }).press("End");
  await page.getByRole("slider", { name: "Typing size" }).press("End");
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("slow");
  await expect(page.locator(".passage")).toHaveCSS("font-weight", "700");
  await expect(page.locator(".passage")).toHaveCSS("font-family", /Georgia/);
  await expect(page.locator(".typing-space")).toHaveCSS(
    "--typing-scale",
    "1.3",
  );
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(page.locator(".passage")).toHaveCSS("font-weight", "700");
  await expect(input).toBeFocused();
  await input.pressSequentially("there");
  await page.keyboard.press("F2");
  await page.getByRole("slider", { name: "Typing size" }).press("Home");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("there");
  await page.reload();
  await expect(input).toBeFocused();
  await page.keyboard.press("F2");
  await expect(page.getByRole("combobox", { name: "Typing font" })).toHaveValue(
    "serif",
  );
  await expect(page.getByRole("slider", { name: "Font weight" })).toHaveValue(
    "700",
  );
  await expect(page.getByRole("slider", { name: "Typing size" })).toHaveValue(
    "80",
  );
});

test("font and size extremes keep the workspace in the viewport and the current letter visible", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  const text = (await page.locator(".passage").innerText()).slice(0, 100);
  await page.getByRole("textbox").fill(text);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    for (const font of ["mono", "system", "serif"]) {
      for (const endpoint of ["Home", "End"]) {
        await page.keyboard.press("F2");
        await page
          .getByRole("combobox", { name: "Typing font" })
          .selectOption(font);
        await page.getByRole("slider", { name: "Typing size" }).press(endpoint);
        await page.getByRole("slider", { name: "Font weight" }).press("End");
        await page.keyboard.press("Escape");
        const bounds = await page.locator(".typing-space").boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const caret = await page.locator(".character.current").boundingBox();
        const passage = await page.locator(".passage-window").boundingBox();
        expect(caret!.y).toBeGreaterThanOrEqual(passage!.y - 1);
        expect(caret!.y + caret!.height).toBeLessThanOrEqual(
          passage!.y + passage!.height + 1,
        );
      }
    }
  }
});
