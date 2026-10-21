import { h } from '../dom.js';
import { pick, shuffle } from '../lib/random.js';
import { flicker, sleep } from '../motion.js';
import { button, copyButton, createHistory, liveRegion, panel, segmented, stepper, switchField, whileBusy } from '../ui.js';

const LATIN = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const GERMAN = [...LATIN, 'Ä', 'Ö', 'Ü'];
const HARD = new Set(['C', 'Q', 'X', 'Y', 'Ä', 'Ö', 'Ü']);

export default {
  id: 'letter',
  category: 'text',
  icon: 'letter',
  messages: {
    de: {
      title: 'Zufallsbuchstabe',
      desc: 'Ein Buchstabe, zum Beispiel für Stadt, Land, Fluss.',
      keywords: 'buchstabe stadt land fluss alphabet abc',
      go: 'Buchstabe ziehen',
      alphabet: 'Alphabet',
      latin: 'A–Z',
      german: 'A–Z + Ä Ö Ü',
      count: 'Anzahl',
      noHard: 'Schwierige Buchstaben auslassen',
      noHardHint: 'Lässt C, Q, X, Y, Ä, Ö und Ü weg.',
      unique: 'Ohne Wiederholung',
      idle: 'Ziehe einen Buchstaben.',
    },
    en: {
      title: 'Random letter',
      desc: 'A letter, for example for word games like Scattergories.',
      keywords: 'letter alphabet abc scattergories word game',
      go: 'Draw letter',
      alphabet: 'Alphabet',
      latin: 'A–Z',
      german: 'A–Z + Ä Ö Ü',
      count: 'Count',
      noHard: 'Skip difficult letters',
      noHardHint: 'Leaves out C, Q, X, Y, Ä, Ö and Ü.',
      unique: 'No repeats',
      idle: 'Draw a letter.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const row = h('div', { class: 'letter-row' }, h('span', { class: 'letter-tile is-idle' }, '?'));
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();
    let last = '';

    const alphabet = segmented({
      label: t('alphabet'),
      options: [
        { value: 'latin', label: t('latin') },
        { value: 'german', label: t('german') },
      ],
      value: ctx.load('alphabet', ctx.lang === 'de' ? 'german' : 'latin'),
      onChange: (v) => ctx.save('alphabet', v),
    });
    const count = stepper({ label: t('count'), value: 1, min: 1, max: 12 });
    const noHard = switchField({ label: t('noHard'), hint: t('noHardHint'), checked: ctx.load('noHard', false), onChange: (v) => ctx.save('noHard', v) });
    const unique = switchField({ label: t('unique'), checked: ctx.load('unique', true), onChange: (v) => ctx.save('unique', v) });

    const go = button({
      label: t('go'),
      icon: 'letter',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const pool = (alphabet.get() === 'german' ? GERMAN : LATIN).filter((l) => !noHard.get() || !HARD.has(l));
          const n = count.get();
          const letters = unique.get() ? shuffle(pool).slice(0, n) : Array.from({ length: n }, () => pick(pool));
          const tiles = letters.map(() => h('span', { class: 'letter-tile' }, ''));
          row.replaceChildren(...tiles);
          note.textContent = '';
          await Promise.all(tiles.map(async (tile, i) => (await sleep(i * 120), flicker(tile, () => pick(pool), letters[i], { steps: 8 + i }))));
          last = letters.join(' ');
          live.textContent = last;
          history.add(last);
        }),
    });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, row, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => last))), history.el),
      h('div', { class: 'controls-col' }, panel(null, alphabet.el, count.el, noHard.el, unique.el)),
    );
  },
};
