import { h } from './dom.js';
import { EASE_SPIN, play, settle } from './motion.js';

/**
 * Walze im Spielautomaten-Stil. `show()` setzt den Ruhezustand,
 * `spin()` lässt eine Folge von Einträgen durchlaufen und bleibt beim letzten stehen.
 */
export function createReel({ text = '?', tone = '' } = {}) {
  const track = h('div', { class: 'reel-track' });
  const el = h('div', { class: 'reel', 'aria-hidden': 'true' }, track);
  let current = { text, tone };

  const item = (entry) => h('div', { class: `reel-item${entry.tone ? ` is-${entry.tone}` : ''}`, title: entry.text }, entry.text);

  function show(entry) {
    current = entry;
    track.replaceChildren(item(entry));
    settle(track, { transform: '' });
  }

  async function spin(sequence, { duration = 2400 } = {}) {
    track.replaceChildren(item(current), ...sequence.map(item));
    const height = track.firstElementChild.offsetHeight;
    await play(track, [{ transform: 'translateY(0)' }, { transform: `translateY(${-height * sequence.length}px)` }], { duration, easing: EASE_SPIN });
    show(sequence[sequence.length - 1]);
  }

  show(current);
  return { el, show, spin };
}
