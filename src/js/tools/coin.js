import { h, s } from '../dom.js';
import { chance, randomInt } from '../lib/random.js';
import { dur, play, settle } from '../motion.js';
import { button, createHistory, liveRegion, whileBusy } from '../ui.js';

const EDGE_SLICES = 12;
const THICKNESS = 14;

function faceArt(kind) {
  const svg = s('svg', { viewBox: '0 0 100 100', class: 'coin-art', 'aria-hidden': 'true' });
  svg.append(s('circle', { cx: 50, cy: 50, r: 41, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, opacity: 0.55 }));
  if (kind === 'heads') {
    svg.append(
      s('circle', { cx: 50, cy: 39, r: 11, fill: 'currentColor' }),
      s('path', { d: 'M28 72c1-13 10-20 22-20s21 7 22 20z', fill: 'currentColor' }),
    );
  } else {
    svg.append(s('path', { d: 'M44 30l10-6v52', fill: 'none', stroke: 'currentColor', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), s('path', { d: 'M38 76h28', fill: 'none', stroke: 'currentColor', 'stroke-width': 7, 'stroke-linecap': 'round' }));
  }
  return svg;
}

export default {
  id: 'coin',
  category: 'decide',
  icon: 'coin',
  messages: {
    de: { title: 'Münzwurf', desc: 'Kopf oder Zahl, mit einer fairen Münze.', keywords: 'kopf zahl werfen', flip: 'Münze werfen', heads: 'Kopf', tails: 'Zahl', idle: 'Wirf die Münze.', stats: 'Bisher: {heads}× Kopf, {tails}× Zahl' },
    en: { title: 'Coin flip', desc: 'Heads or tails with a fair coin.', keywords: 'heads tails toss', flip: 'Flip coin', heads: 'Heads', tails: 'Tails', idle: 'Flip the coin.', stats: 'So far: {heads}× heads, {tails}× tails' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    let heads = 0;
    let tails = 0;
    let face = 0; // aktuelle Lage: 0° = Kopf oben, 180° = Zahl oben

    const coin = h('div', { class: 'coin' });
    const front = h('div', { class: 'coin-face is-front' }, faceArt('heads'), h('span', { class: 'coin-label' }, t('heads')));
    const back = h('div', { class: 'coin-face is-back' }, faceArt('tails'), h('span', { class: 'coin-label' }, t('tails')));
    front.style.transform = `translateZ(${THICKNESS / 2}px)`;
    back.style.transform = `rotateX(180deg) translateZ(${THICKNESS / 2}px)`;
    coin.append(front, back);
    for (let i = 0; i < EDGE_SLICES; i++) {
      const slice = h('div', { class: 'coin-edge' });
      slice.style.transform = `translateZ(${-THICKNESS / 2 + 1 + ((THICKNESS - 2) * i) / (EDGE_SLICES - 1)}px)`;
      coin.append(slice);
    }
    const arc = h('div', { class: 'coin-arc' }, coin);
    const shadow = h('div', { class: 'coin-shadow' });
    const scene = h('div', { class: 'coin-scene' }, arc, shadow);

    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    const flip = button({
      label: t('flip'),
      icon: 'coin',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(flip, async () => {
          const isHeads = chance(50);
          const target = isHeads ? 0 : 180;
          // Die Drehung startet in der aktuellen Lage, sonst würde die Münze zu Beginn sichtbar umspringen.
          const end = face + (5 + randomInt(0, 3)) * 360 + ((target - face + 360) % 360);
          const time = dur(1900);
          note.textContent = '';
          await Promise.all([
            play(coin, [{ transform: `rotateX(${face}deg)` }, { transform: `rotateX(${end}deg)` }], { duration: time, easing: 'cubic-bezier(0.22, 0.7, 0.28, 1)' }),
            play(
              arc,
              [
                { transform: 'translateY(0) scale(1)', easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
                { transform: 'translateY(-5.5rem) scale(1.22)', offset: 0.46, easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)' },
                { transform: 'translateY(0) scale(1)' },
              ],
              { duration: time },
            ),
            play(
              shadow,
              [
                { transform: 'scale(1)', opacity: 0.55, easing: 'ease-out' },
                { transform: 'scale(0.62)', opacity: 0.22, offset: 0.46, easing: 'ease-in' },
                { transform: 'scale(1)', opacity: 0.55 },
              ],
              { duration: time },
            ),
          ]);
          face = target;
          settle(coin, { transform: `rotateX(${face}deg)` });
          settle(arc);
          settle(shadow);
          if (isHeads) heads++;
          else tails++;
          const label = isHeads ? t('heads') : t('tails');
          note.textContent = t('stats', { heads, tails });
          live.textContent = label;
          history.add(label);
        }),
    });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, scene, note, live), h('div', { class: 'stage-actions' }, flip)), history.el),
    );
    root.classList.add('is-single');
  },
};
