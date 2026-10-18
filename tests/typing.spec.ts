import { expect, test } from "@playwright/test";

test("typing marks characters, supports correction, and expires with honest accuracy", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await input.focus();
  await page.clock.fastForward(40_000);
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await input.pressSequentially("slx");
  await expect(page.locator(".character.correct")).toHaveCount(2);
  await expect(page.locator(".character.incorrect")).toHaveCount(1);
  await expect(page.locator(".character.current")).toHaveText("w");
  await input.press("Backspace");
  await input.press("o");
  await expect(page.locator(".character.correct")).toHaveCount(3);
  await expect(page.locator(".character.incorrect")).toHaveCount(0);
  await page.getByRole("button", { name: "Open appearance settings" }).click();
  await page.clock.fastForward(30_000);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("timer")).toHaveText("0s remaining");
  await expect(input).toHaveAttribute("readonly", "");
  await expect(page.locator(".session-metrics")).toContainText("75% accuracy");
  await expect(page.locator(".session-metrics")).toContainText(
    "1 incorrect attempt",
  );
  await input.press("w");
  await expect(input).toHaveValue("slo");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await expect(page.locator(".session-metrics")).toHaveCount(0);
  await input.press("s");
  await page.clock.fastForward(1000);
  await expect(page.getByRole("timer")).toHaveText("29s remaining");
});

test("restart while running cancels the old deadline and changing mode resets input", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await input.pressSequentially("slow");
  await page.clock.fastForward(20_000);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await input.press("s");
  await page.clock.fastForward(15_000);
  await expect(page.getByRole("timer")).toHaveText("15s remaining");
  await expect(input).not.toHaveAttribute("readonly");
  await page.getByRole("button", { name: "Zen", exact: true }).click();
  await expect(input).toHaveValue("");
  await input.pressSequentially("there");
  await page.clock.fastForward(90_000);
  await expect(page.getByRole("timer")).toHaveText("90s elapsed");
  await expect(input).not.toHaveAttribute("readonly");
});

test("mobile input events work, repeat/paste are blocked, and a passage can complete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await input.focus();
  await page.keyboard.down("s");
  await page.keyboard.down("s");
  await page.keyboard.up("s");
  await expect(input).toHaveValue("s");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  const pasteAllowed = await input.evaluate((element) =>
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true }),
    ),
  );
  expect(pasteAllowed).toBe(false);
  await input.fill("slow");
  await expect(page.locator(".character.correct")).toHaveCount(4);
  const passage = await page.locator(".passage").innerText();
  await input.fill(passage);
  await expect(input).toHaveAttribute("readonly", "");
  await expect(page.locator(".session-metrics")).toContainText("100% accuracy");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("composition commits once and keeps intermediate text out of scoring", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Type the passage" });
  await input.focus();
  await input.evaluate((element) => {
    element.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, "x");
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: "x",
        isComposing: true,
      }),
    );
  });
  await expect(input).toHaveValue("x");
  await expect(page.locator(".character.incorrect")).toHaveCount(0);
  await expect(page.getByRole("timer")).toHaveText("30s remaining");
  await input.evaluate((element) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, "s");
    element.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "s" }),
    );
  });
  await expect(input).toHaveValue("s");
  await expect(page.locator(".character.correct")).toHaveCount(1);
  await expect(page.locator(".character.incorrect")).toHaveCount(0);
});
