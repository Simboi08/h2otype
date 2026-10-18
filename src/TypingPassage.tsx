import { memo, useEffect, useRef } from "react";

type Props = {
  passage: string;
  typed: string;
  focused: boolean;
  finished: boolean;
};

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
  useEffect(() => {
    const active = caret.current;
    const container = windowRef.current;
    if (!container) return;
    if (!typed.length) {
      container.scrollTop = 0;
      return;
    }
    if (!active) return;
    const bounds = container.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.bottom > bounds.bottom)
      container.scrollTop += target.bottom - bounds.bottom + 12;
    if (target.top < bounds.top)
      container.scrollTop -= bounds.top - target.top + 12;
  }, [typed]);
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
