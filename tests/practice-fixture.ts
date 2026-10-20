import { test as base, expect } from "@playwright/test";
import { defaultPreferences } from "../src/preferences";

// Keep timing/scoring regressions reproducible while fresh installs use random words.
export const sentenceStorage = {
  cookies: [],
  origins: [
    {
      origin: "http://127.0.0.1:4173",
      localStorage: [
        { name: "h2otype.word-set.v1", value: '"sentences"' },
        // Returning-player preset keeps earlier regression geometry/audio deterministic.
        {
          name: "h2otype.preferences.v1",
          value: JSON.stringify({
            version: 1,
            preferences: {
              ...defaultPreferences,
              typingFont: "mono",
              soundStyle: "off",
              particleStyle: "off",
              graphicsTier: "medium",
              scrollDuration: 0,
              caretDuration: 0,
              confettiAmount: 50,
            },
          }),
        },
      ],
    },
  ],
};
export const test = base.extend({ storageState: sentenceStorage });
export { expect };
