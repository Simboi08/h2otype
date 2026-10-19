import { useEffect, useEffectEvent, useRef } from "react";
import { usePreferences } from "./preferences";
import { playCompletionSound, stopTypingSounds } from "./typingSound";

export function useCompletionSound(completed: boolean) {
  const { preferences } = usePreferences();
  // A restored Zen summary is not a newly completed test.
  const previous = useRef(completed);
  const play = useEffectEvent(() =>
    playCompletionSound(preferences.soundStyle, preferences.soundVolume),
  );
  useEffect(() => {
    if (completed && !previous.current) play();
    previous.current = completed;
    return () => stopTypingSounds();
  }, [completed]);
}
