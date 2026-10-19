import { memo, useLayoutEffect, useRef } from "react";
import { usePreferences } from "./preferences";

type Props = {
  passage: string;
  typed: string;
  focused: boolean;
  finished: boolean;
};

function revealCaret(
  container: HTMLDivElement,
  active: HTMLSpanElement | null,
) {
  if (!active) return;
  const bounds = container.getBoundingClientRect();
  const target = active.getBoundingClientRect();
  if (target.bottom > bounds.bottom)
    container.scrollTop += target.bottom - bounds.bottom + 12;
  else if (target.top < bounds.top)
    container.scrollTop -= bounds.top - target.top + 12;
}

// Timer ticks do not redraw thousands of unchanged character spans.
const TypingPassage = memo(function TypingPassage({
  passage,
  typed,
  focused,
  finished,
}: Props) {
  const caret = useRef<HTMLSpanElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const typedCharacters = [...typed];
  const {
    preferences: { typingFont, typingWeight, typingScale, characterSpacing },
  } = usePreferences();
  useLayoutEffect(() => {
    const active = caret.current;
    const container = windowRef.current;
    if (!container) return;
    if (!typed.length) {
      container.scrollTop = 0;
      return;
    }
    revealCaret(container, active);
  }, [typed, typingFont, typingWeight, typingScale, characterSpacing]);
  useLayoutEffect(() => {
    const container = windowRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() =>
      revealCaret(container, caret.current),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  // Trailing spaces travel with their word instead of indenting the next line.
  let position = 0;
  return (
    <div
      className={`passage-window ${focused ? "is-focused" : ""}`}
      ref={windowRef}
    >
      <p className="passage" aria-hidden="true">
        {(passage.match(/\S+\s*|\s+/g) ?? []).map((word, wordIndex) => (
          <span className="passage-word" key={wordIndex}>
            {[...word].map((char) => {
              const index = position++;
              const current = index === typedCharacters.length && !finished;
              const status =
                index < typedCharacters.length
                  ? typedCharacters[index] === char
                    ? "correct"
                    : "incorrect"
                  : "pending";
              return (
                <span
                  key={index}
                  className={`character ${status} ${current ? "current" : ""}`}
                  ref={current ? caret : undefined}
                >
                  {char}
                </span>
              );
            })}
          </span>
        ))}
      </p>
    </div>
  );
});

export default TypingPassage;
