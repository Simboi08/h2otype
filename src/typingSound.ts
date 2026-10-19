import { useSyncExternalStore } from "react";
import type { SoundStyle } from "./preferences";

export function createSoundSamples(
  style: Exclude<SoundStyle, "off">,
  sampleRate: number,
) {
  const duration = style === "standard" ? 0.035 : 0.055;
  const samples = new Float32Array(Math.round(sampleRate * duration));
  let seed = 731;
  let held = 0;
  const hold = Math.max(1, Math.round(sampleRate / 6000));
  for (let index = 0; index < samples.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    const time = index / sampleRate;
    const envelope =
      Math.min(1, time / 0.001) * Math.pow(1 - index / samples.length, 3);
    if (style === "standard")
      samples[index] =
        (noise * 0.28 + Math.sin(2 * Math.PI * 850 * time) * 0.16) * envelope;
    else {
      if (index % hold === 0)
        held =
          Math.round(
            (Math.sin(2 * Math.PI * 330 * time) * 0.32 + noise * 0.1) * 16,
          ) / 16;
      samples[index] = held * envelope;
    }
  }
  return samples;
}

let context: AudioContext | null = null;
const buffers = new Map<SoundStyle, AudioBuffer>();
const voices = new Set<AudioBufferSourceNode>();
let resuming = false;
let generation = 0;
let audioStatus = "";
const listeners = new Set<() => void>();
function status(message: string) {
  if (audioStatus === message) return;
  audioStatus = message;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useAudioStatus() {
  return useSyncExternalStore(subscribe, () => audioStatus);
}

export function stopTypingSounds() {
  generation++;
  for (const source of voices) {
    try {
      source.stop();
    } catch {
      /* An already-ended voice is harmless. */
    }
  }
  voices.clear();
}

export function playTypingSound(style: SoundStyle, volume: number) {
  if (style === "off" || volume <= 0 || document.hidden) return;
  try {
    if (!context || context.state === "closed") {
      const Constructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Constructor) throw new Error("Audio unavailable");
      context = new Constructor();
      buffers.clear();
    }
    const activeContext = context;
    const emit = () => {
      if (document.hidden || activeContext.state !== "running") return;
      let buffer = buffers.get(style);
      if (!buffer) {
        const samples = createSoundSamples(style, activeContext.sampleRate);
        buffer = activeContext.createBuffer(
          1,
          samples.length,
          activeContext.sampleRate,
        );
        buffer.getChannelData(0).set(samples);
        buffers.set(style, buffer);
      }
      // Short envelopes and at most four voices prevent a typing backlog.
      if (voices.size >= 4) {
        const oldest = voices.values().next().value!;
        oldest.stop();
        voices.delete(oldest);
      }
      const source = activeContext.createBufferSource();
      const gain = activeContext.createGain();
      source.buffer = buffer;
      gain.gain.value = (Math.min(100, volume) / 100) * 0.3;
      source.connect(gain);
      gain.connect(activeContext.destination);
      voices.add(source);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        voices.delete(source);
      };
      source.start();
      status("");
    };
    if (activeContext.state !== "running") {
      if (resuming) return;
      resuming = true;
      const requestedAt = performance.now();
      const requestedGeneration = generation;
      void activeContext
        .resume()
        .then(() => {
          resuming = false;
          if (activeContext.state !== "running")
            throw new Error("Audio suspended");
          // Discard delayed notes instead of playing a burst after interruption.
          if (
            generation === requestedGeneration &&
            performance.now() - requestedAt < 150
          )
            emit();
        })
        .catch(() => {
          resuming = false;
          status("Sound could not play. Try Preview sound or keep sound off.");
        });
    } else emit();
  } catch {
    status("Sound is unavailable in this browser. Typing still works.");
  }
}
