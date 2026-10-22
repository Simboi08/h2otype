import type { GraphicsTier } from "./preferences";

export function comboSparkProfile(
  tier: number,
  quality: GraphicsTier,
  intensity: number,
) {
  const power = Math.max(0, Math.min(5, tier));
  return {
    count:
      quality === "low" || intensity === 0
        ? 0
        : Math.round(
            (quality === "high" ? 10 + power * 2 : 6 + power) *
              (intensity === 1 ? 0.5 : 1),
          ),
    size: 5 + power * 1.5,
    maximum: quality === "high" ? 64 : 36,
  };
}

// Own each short-lived sprite. The layer is a viewport portal, so sparks cannot
// stretch page layout or get clipped by the meter/game panel on mobile browsers.
export function createComboSparks(layer: HTMLDivElement) {
  const live = new Map<
    HTMLElement,
    { animation: Animation; timer: ReturnType<typeof setTimeout> }
  >();
  const remove = (particle: HTMLElement) => {
    const record = live.get(particle);
    record?.animation.cancel();
    clearTimeout(record?.timer);
    live.delete(particle);
    particle.remove();
  };
  return {
    clear() {
      for (const particle of live.keys()) remove(particle);
    },
    emit(
      x: number,
      y: number,
      tier: number,
      quality: GraphicsTier,
      intensity: number,
      upgrade: boolean,
    ) {
      const profile = comboSparkProfile(tier, quality, intensity);
      if (!profile.count || document.hidden) return;
      const chargeCount = quality === "high" ? 6 : 3;
      const count = upgrade
        ? profile.count
        : intensity === 1
          ? Math.ceil(chargeCount / 2)
          : chargeCount;
      for (let index = 0; index < count; index++) {
        while (live.size >= profile.maximum) remove(live.keys().next().value!);
        const particle = document.createElement("i");
        particle.dataset.kind = upgrade ? "upgrade" : "charge";
        particle.dataset.tier = String(tier);
        const unit = Math.random();
        const size = upgrade ? profile.size + unit * 2 : 2 + unit * 2;
        const angle = upgrade
          ? (index / count) * Math.PI * 2
          : (unit - 0.5) * 1.5;
        const distance = upgrade ? 28 + tier * 9 + unit * 30 : 24 + unit * 62;
        particle.style.cssText = `left:${x}px;top:${y}px;width:${upgrade ? size : size * 2.5}px;height:${size}px;background:${index % 3 === 0 ? "var(--accent)" : index % 3 === 1 ? "#ffd278" : "var(--pink)"}`;
        layer.append(particle);
        const animation = particle.animate(
          [
            { transform: "translate(-50%, -50%) scale(0.8)", opacity: 1 },
            {
              transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) rotate(${upgrade ? 100 : (angle * 180) / Math.PI}deg) scale(0.2)`,
              opacity: 0,
            },
          ],
          {
            duration: upgrade ? 520 + tier * 35 : 240,
            easing: "cubic-bezier(0.1, 0.6, 0.3, 1)",
            fill: "both",
          },
        );
        const timer = setTimeout(
          () => remove(particle),
          upgrade ? 520 + tier * 35 : 240,
        );
        live.set(particle, { animation, timer });
        animation.onfinish = () => remove(particle);
      }
    },
  };
}
