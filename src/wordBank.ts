import english from "./data/english.json" with { type: "json" };

export const wordSets = [
  {
    id: "english100",
    label: "English 100",
    description: "100 common words · short and familiar",
  },
  {
    id: "english500",
    label: "English 500",
    description: "500 common words · more variety",
  },
  {
    id: "english1000",
    label: "English 1,000",
    description: "1,000 common words · the widest pool",
  },
  {
    id: "sentences",
    label: "English sentences",
    description: "Original sentences · punctuation included",
  },
] as const;
export type WordSet = (typeof wordSets)[number]["id"];
export type GeneratedWordSet = Exclude<WordSet, "sentences">;
export const wordPools = {
  english100: english.slice(0, 100),
  english500: english.slice(0, 500),
  english1000: english,
};
export const wordSetKey = "h2otype.word-set.v1";
export function isWordSet(value: unknown): value is WordSet {
  return wordSets.some((set) => set.id === value);
}
export function freshSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
}

// Deterministic continuation lets a saved Zen draft resume without changing words.
export function generateWords(
  set: GeneratedWordSet,
  seed: number,
  count: number,
  previous = "",
) {
  let randomState = seed >>> 0 || 1;
  const pool = wordPools[set];
  const words: string[] = [];
  for (let index = 0; index < count; index++) {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    randomState >>>= 0;
    let choice = randomState % pool.length;
    if (pool[choice] === previous) choice = (choice + 1) % pool.length;
    previous = pool[choice];
    words.push(previous);
  }
  return { text: words.join(" ") + " ", randomState };
}

export function loadWordSet(draft?: WordSet): {
  wordSet: WordSet;
  storageAvailable: boolean;
} {
  try {
    const raw = localStorage.getItem(wordSetKey);
    let saved: unknown;
    try {
      saved = JSON.parse(raw ?? "null");
    } catch {
      saved = null;
    }
    return {
      wordSet: draft ?? (isWordSet(saved) ? saved : "english100"),
      storageAvailable: true,
    };
  } catch {
    return { wordSet: draft ?? "english100", storageAvailable: false };
  }
}
export function saveWordSet(set: WordSet) {
  try {
    localStorage.setItem(wordSetKey, JSON.stringify(set));
    return true;
  } catch {
    return false;
  }
}
