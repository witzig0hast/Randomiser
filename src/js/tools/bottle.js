import { h, s } from '../dom.js';
import { randomBelow, randomFloat } from '../lib/random.js';
import { dur, play, settle } from '../motion.js';
import { button, createHistory, listEditor, liveRegion, panel, whileBusy } from '../ui.js';

const MAX_PLAYERS = 16;

export default {
  id: 'bottle',
  category: 'groups',
  icon: 'bottle',
  messages: {
    de: { title: 'Flaschendrehen', desc: 'Die Flasche zeigt auf eine Person.', keywords: 'flasche drehen wahrheit pflicht spiel runde wer', spin: 'Flasche drehen', hint: 'Bis zu {n} Namen. Die Flasche zeigt auf eine Person.', idle: 'Gib die Mitspielenden ein und drehe die Flasche.', aria: 'Flasche zeigt auf {name}' },
    en: { title: 'Spin the bottle', desc: 'The bottle points at one person.', keywords: 'bottle spin truth dare game circle who', spin: 'Spin bottle', hint: 'Up to {n} names. The bottle points at one person.', idle: 'Enter the players and spin the bottle.', aria: 'The bottle points at {name}' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    let names = [];
    let angle = 0; // aktuelle Drehung in Grad, im Uhrzeigersinn ab „oben“

    const table = h('div', { class: 'bottle-table' });
    const bottle = s(
      'svg',
      { class: 'bottle-art', viewBox: '0 0 40 120', 'aria-hidden': 'true' },
      s('path', { d: 'M16 4h8v4c0 2 1 4 3 8 3 6 5 10 5 17v73a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V33c0-7 2-11 5-17 2-4 3-6 3-8z', class: 'bottle-body' }),
      s('rect', { x: 14, y: 2, width: 12, height: 5, rx: 2, class: 'bottle-cap' }),
      s('path', { d: 'M14 46h12v36H14z', class: 'bottle-label' }),
    );
    const rotor = h('div', { class: 'bottle-rotor' }, bottle);
    table.append(rotor);

    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    function layout() {
      table.querySelectorAll('.bottle-seat').forEach((el) => el.remove());
      names.forEach((name, i) => {
        const theta = (i / names.length) * 2 * Math.PI;
        const seat = h('span', { class: 'bottle-seat', title: name, dataset: { i: String(i) } }, name);
        seat.style.left = `${50 + 41 * Math.sin(theta)}%`;
        seat.style.top = `${50 - 41 * Math.cos(theta)}%`;
        table.append(seat);
      });
    }

    const editor = listEditor({
      label: t('itemsLabel'),
      value: ctx.load('items', ['Anna', 'Ben', 'Chiara', 'David', 'Emma', 'Felix'].join('\n')),
      placeholder: 'Anna\nBen\nChiara',
      rows: 8,
      maxItems: MAX_PLAYERS,
      hint: t('hint', { n: MAX_PLAYERS }),
      onChange: (v) => {
        ctx.save('items', v);
        names = editor.items();
        layout();
      },
    });

    const spin = button({
      label: t('spin'),
      icon: 'bottle',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(spin, async () => {
          note.classList.remove('is-error', 'is-result');
          if (names.length < 2) {
            note.textContent = ctx.t('needItems', { n: 2 });
            note.classList.add('is-error');
            return;
          }
          table.querySelectorAll('.is-target').forEach((el) => el.classList.remove('is-target'));
          const winner = randomBelow(names.length);
          const step = 360 / names.length;
          const aim = winner * step + (randomFloat() - 0.5) * step * 0.6;
          const delta = (4 + randomBelow(3)) * 360 + ((((aim - angle) % 360) + 360) % 360);
          note.textContent = '';
          await play(rotor, [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${angle + delta}deg)` }], { duration: dur(4600), easing: 'cubic-bezier(0.1, 0.65, 0.15, 1)' });
          angle = (angle + delta) % 360;
          settle(rotor, { transform: `rotate(${angle}deg)` });
          table.querySelector(`.bottle-seat[data-i="${winner}"]`)?.classList.add('is-target');
          note.textContent = names[winner];
          note.classList.add('is-result');
          live.textContent = t('aria', { name: names[winner] });
          history.add(names[winner]);
        }),
    });

    names = editor.items();
    layout();
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, table, note, live), h('div', { class: 'stage-actions' }, spin)), history.el),
      h('div', { class: 'controls-col' }, panel(null, editor.el)),
    );
  },
};
