import { memo, useLayoutEffect, useRef } from "react";
import { usePreferences } from "./preferences";
import { useReducedMotion } from "./useReducedMotion";

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
  const active = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const goal = useRef(-1);
  const measure = useRef<(instant?: boolean) => void>(() => {});
  const previousPosition = useRef<{ x: number; y: number } | null>(null);
  const typedCharacters = [...typed];
  const {
    preferences: {
      typingFont,
      typingWeight,
      typingScale,
      characterSpacing,
      scrollDuration,
      caretDuration,
    },
  } = usePreferences();
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const container = windowRef.current;
    if (!container) return;
    const cancelScroll = () => {
      if (scrollFrame.current !== null)
        cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
    const place = (instant = false) => {
      const character = active.current;
      const indicator = caret.current;
      const first = container.querySelector<HTMLElement>(".character");
      const paragraph = container.querySelector<HTMLElement>(".passage");
      if (!character || !indicator || !first || !paragraph) return;
      const lineHeight = Number.parseFloat(
        getComputedStyle(paragraph).lineHeight,
      );
      container.style.setProperty("--passage-line-height", `${lineHeight}px`);
      const target = character.getBoundingClientRect();
      const bounds = container.getBoundingClientRect();
      const x = target.left - bounds.left + container.scrollLeft;
      const y = target.top - bounds.top + container.scrollTop;
      const previous = previousPosition.current;
      // A line wrap jumps to the new line; horizontal movement can ease independently.
      indicator.style.transitionDuration =
        instant ||
        reduced ||
        !typed.length ||
        !previous ||
        Math.abs(previous.y - y) > 2
          ? "0ms"
          : `${caretDuration}ms`;
      indicator.style.transform = `translate(${x - 2}px, ${y}px)`;
      indicator.style.height = `${target.height}px`;
      previousPosition.current = { x, y };
      const nextGoal = !typed.length
        ? 0
        : Math.min(
            container.scrollHeight - container.clientHeight,
            Math.max(
              0,
              Math.round(target.top - first.getBoundingClientRect().top),
            ),
          );
      if (
        !instant &&
        !reduced &&
        scrollDuration > 0 &&
        goal.current === nextGoal
      )
        return;
      goal.current = nextGoal;
      cancelScroll();
      if (instant || reduced || scrollDuration === 0 || !typed.length) {
        container.scrollTop = nextGoal;
        return;
      }
      const from = container.scrollTop;
      const started = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - started) / scrollDuration);
        container.scrollTop =
          from + (nextGoal - from) * (1 - Math.pow(1 - progress, 3));
        scrollFrame.current = progress < 1 ? requestAnimationFrame(step) : null;
      };
      scrollFrame.current = requestAnimationFrame(step);
    };
    measure.current = place;
    place();
  }, [
    typed,
    passage,
    typingFont,
    typingWeight,
    typingScale,
    characterSpacing,
    scrollDuration,
    caretDuration,
    reduced,
  ]);

  useLayoutEffect(() => {
    const container = windowRef.current;
    if (!container) return;
    const resize = () => measure.current(true);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) resize();
    });
    const hidden = () => {
      if (document.hidden) resize();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", hidden);
      if (scrollFrame.current !== null)
        cancelAnimationFrame(scrollFrame.current);
    };
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
                  ref={current ? active : undefined}
                >
                  {char}
                </span>
              );
            })}
          </span>
        ))}
      </p>
      {!finished && (
        <span className="typing-caret" aria-hidden="true" ref={caret} />
      )}
    </div>
  );
});
export default TypingPassage;
