import type { Session } from "./typingEngine";

// This describes an accepted edit without changing scoring or XP. Zen may have
// retired old words, so locate the newest correct character in the new passage.
export function getTypingFeedback(
  before: Session,
  after: Session,
  passage: string,
) {
  const added = after.attempts - before.attempts;
  if (added <= 0) return { accepted: false, correctIndex: null };
  const typed = [...after.typed];
  const target = [...passage];
  for (
    let index = typed.length - 1;
    index >= Math.max(0, typed.length - Math.min(added, 8));
    index--
  ) {
    if (typed[index] === target[index])
      return { accepted: true, correctIndex: index };
  }
  return { accepted: true, correctIndex: null };
}
