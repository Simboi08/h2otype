import { expect, test } from "@playwright/test";

test("typing is ready on arrival and the first character is preserved after focus leaves the field", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await page.locator("#main").focus();
  await expect(page.locator("#main")).toHaveCSS("outline-style", "none");
  await page.keyboard.type("s");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("s");
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .focus();
  await page.keyboard.type("l");
  await expect(input).toHaveValue("sl");
  await input.evaluate((element) => element.blur());
  await page.keyboard.type("ow ");
  await expect(input).toHaveValue("");
  await expect(page.locator(".character.correct")).toHaveCount(5);
  await page.locator(".passage").click();
  await page.keyboard.type("down");
  await expect(input).toHaveValue("down");
  await expect(page.locator(".character.correct")).toHaveCount(9);
  await expect(input).toHaveCSS("outline-style", "none");
});

test("Tab restarts and Shift+Tab stays in typing without cycling page controls", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeVisible();
  await input.pressSequentially("slow");
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("slow");
  }
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("slow");
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
});

test("F2 opens Settings, its keyboard controls leave typing intact, and closing returns to typing", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  await page.keyboard.type("s");
  await page.keyboard.press("F2");
  const close = page.getByRole("button", {
    name: "Close settings",
    exact: true,
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).not.toBeFocused();
  await expect(input).not.toBeFocused();
  const liveWpm = page.getByRole("switch", { name: "Live WPM", exact: true });
  await liveWpm.focus();
  await page.keyboard.press("Space");
  await expect(liveWpm).toBeChecked();
  await expect(liveWpm).toHaveCSS("outline-style", "solid");
  await expect(input).toHaveValue("s");
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await page.keyboard.type("l");
  await expect(input).toHaveValue("sl");
  await expect(page.locator(".character.correct")).toHaveCount(2);
});

test("Zen is ready for typing, but paused and restored sessions stay paused until resumed", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-19T12:01:00Z"));
  await page.goto("/");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  const input = page.getByRole("textbox");
  await expect(input).toBeFocused();
  await expect(page.getByRole("timer")).toHaveText("0s elapsed");
  await page.keyboard.type("there");
  await page.clock.fastForward(1000);
  await expect(page.getByRole("timer")).toHaveText("1s elapsed");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const heading = page.getByRole("heading", { name: "Zen paused" });
  await expect(heading).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(heading).toBeFocused();
  await page.keyboard.type("x");
  await expect(input).toHaveCount(0);
  await expect(page.locator(".session-xp")).toHaveText("+5 XP this session");
  await page.reload();
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(heading).toBeFocused();
  await page.keyboard.press("F2");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(heading).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("there");
  await page.keyboard.press("Space");
  await expect(input).toHaveValue("");
  await expect(page.locator(".character.correct")).toHaveCount(6);
});
