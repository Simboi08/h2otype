import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import type { GraphicsTier, ParticleStyle } from "./preferences";
import { graphicsProfiles, particleVelocity } from "./graphics";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  pixel: boolean;
  color: string;
};
export type ParticleHandle = {
  emit: (x: number, y: number) => void;
  clear: () => void;
};

export default function TypingParticles({
  ref,
  style,
  tier,
}: {
  ref: Ref<ParticleHandle>;
  style: Exclude<ParticleStyle, "off">;
  tier: GraphicsTier;
}) {
  const profile = graphicsProfiles[tier];
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef<number | null>(null);
  const previous = useRef(0);
  const drawing = useRef<CanvasRenderingContext2D | null>(null);

  function clear() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    particles.current = [];
    drawing.current?.clearRect(0, 0, innerWidth, innerHeight);
  }
  function draw(now: number) {
    const ctx = drawing.current;
    if (!ctx) return;
    if (tier === "low" && now - previous.current < 1000 / profile.fps - 0.1) {
      frame.current = requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const dt = Math.min(0.04, Math.max(0, now - previous.current) / 1000);
    previous.current = now;
    particles.current = particles.current.filter(
      (particle) => now - particle.born < profile.lifetime,
    );
    for (const particle of particles.current) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 70 * dt;
      ctx.globalAlpha = (1 - (now - particle.born) / profile.lifetime) * 0.8;
      ctx.fillStyle = particle.color;
      if (particle.pixel) ctx.fillRect(particle.x, particle.y, 6, 6);
      else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    frame.current = particles.current.length
      ? requestAnimationFrame(draw)
      : null;
  }
  useImperativeHandle(ref, () => ({
    clear,
    emit(x, y) {
      if (!drawing.current || document.hidden) return;
      const now = performance.now();
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      const burst = style === "pixel" ? profile.pixelBurst : profile.burst;
      const maximum =
        style === "pixel" ? profile.pixelMaximum : profile.maximum;
      for (let index = 0; index < burst; index++) {
        const velocity = particleVelocity(Math.random(), Math.random(), tier);
        particles.current.push({
          x,
          y,
          ...velocity,
          born: now,
          pixel: style === "pixel",
          color,
        });
      }
      particles.current = particles.current.slice(-maximum);
      if (frame.current === null) {
        previous.current = now;
        frame.current = requestAnimationFrame(draw);
      }
    },
  }));
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    try {
      drawing.current = element.getContext("2d");
    } catch {
      return;
    }
    const resize = () => {
      clear();
      const ratio = Math.min(devicePixelRatio || 1, profile.resolution);
      element.width = Math.round(innerWidth * ratio);
      element.height = Math.round(innerHeight * ratio);
      drawing.current?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      drawing.current = null;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [profile.resolution]);
  return (
    <canvas ref={canvas} className="typing-particles" aria-hidden="true" />
  );
}
