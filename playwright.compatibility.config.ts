import { defineConfig, devices } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig(config, {
  testMatch: "device-compatibility.spec.ts",
  projects: [
    {
      name: "chromium-tablet",
      use: {
        ...devices["iPad (gen 7) landscape"],
        browserName: "chromium",
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "webkit-tablet",
      use: {
        ...devices["iPad (gen 7) landscape"],
        browserName: "webkit",
        launchOptions: {},
      },
    },
  ],
});
