/** Hilfen für Animationen. Respektiert `prefers-reduced-motion`. */
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export function reducedMotion() {
  return query.matches;
}

export const EASE_OUT = 'cubic-bezier(0.16, 0.84, 0.24, 1)';
export const EASE_SPIN = 'cubic-bezier(0.12, 0.72, 0.18, 1)';
export const EASE_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion() ? 0 : ms));

/**
 * Web-Animations-Wrapper. Bei reduzierter Bewegung wird nichts animiert;
 * der Aufrufer setzt den Endzustand selbst (z. B. per `style`).
 */
export function play(el, keyframes, options) {
  if (reducedMotion() || !el.animate) return Promise.resolve();
  return el.animate(keyframes, { fill: 'both', ...options }).finished.catch(() => {});
}

/** Gibt eine Dauer zurück, die bei reduzierter Bewegung auf 0 schrumpft. */
export const dur = (ms) => (reducedMotion() ? 0 : ms);

export const easeOutQuart = (x) => 1 - (1 - x) ** 4;
export const easeOutCubic = (x) => 1 - (1 - x) ** 3;

/** requestAnimationFrame-Schleife über `duration` ms; `step(progress 0..1)`. */
export function tween(duration, step) {
  if (reducedMotion() || duration <= 0) {
    step(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      step(p);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** Setzt den Endzustand als Inline-Style und entfernt die (mit `fill: both` haltenden) Animationen. */
export function settle(el, styles = {}) {
  Object.assign(el.style, styles);
  el.getAnimations().forEach((a) => a.cancel());
}

/** Lässt den Text eines Elements kurz „durchlaufen“ (`produce()` liefert Zwischenwerte) und endet mit `final`. */
export async function flicker(el, produce, final, { steps = 9, interval = 55 } = {}) {
  for (let i = 0; i < steps; i++) {
    el.textContent = produce();
    await sleep(interval + i * 14);
  }
  el.textContent = final;
}
