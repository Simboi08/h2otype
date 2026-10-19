import { test as base, expect } from "@playwright/test";

// Keep timing/scoring regressions reproducible while fresh installs use random words.
export const sentenceStorage = {
  cookies: [],
  origins: [
    {
      origin: "http://127.0.0.1:4173",
      localStorage: [{ name: "h2otype.word-set.v1", value: '"sentences"' }],
    },
  ],
};
export const test = base.extend({ storageState: sentenceStorage });
export { expect };
