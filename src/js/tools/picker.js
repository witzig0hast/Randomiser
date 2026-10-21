import { h } from '../dom.js';
import { pick, randomBelow, sample } from '../lib/random.js';
import { sleep } from '../motion.js';
import { createReel } from '../reel.js';
import { button, copyButton, createHistory, listEditor, liveRegion, numberField, panel, switchField, whileBusy } from '../ui.js';

const common = {
  de: {
    draw: 'Ziehen',
    winners: 'Anzahl der Ziehungen',
    removeAfter: 'Gezogene Einträge entfernen',
    removeHint: 'Praktisch, wenn jeder nur einmal drankommen soll.',
    idle: 'Trage mindestens zwei Einträge ein und drücke „Ziehen“.',
    tooFew: 'Für diese Ziehung fehlen Einträge.',
    drawn: 'Gezogen',
    reset: 'Beispielliste laden',
  },
  en: {
    draw: 'Draw',
    winners: 'Number of picks',
    removeAfter: 'Remove picked entries',
    removeHint: 'Handy when everyone should only get one turn.',
    idle: 'Enter at least two entries and press “Draw”.',
    tooFew: 'Not enough entries for this draw.',
    drawn: 'Picked',
    reset: 'Load example list',
  },
};

/**
 * Erzeugt ein Listen-Werkzeug (Auswahl aus eigener Liste). Wird für die freie Auswahl
 * sowie für die Varianten mit Beispiellisten („Was essen wir?“) genutzt.
 */
export function createPickerTool({ id, icon, category = 'decide', messages }) {
  const merged = Object.fromEntries(Object.keys(messages).map((lang) => [lang, { ...common[lang], ...messages[lang] }]));
  return {
    id,
    category,
    icon,
    messages: merged,
    mount(root, ctx) {
      const { t } = ctx;
      const example = t('example');
      const hasExample = example !== 'example';

      const reel = createReel({ text: '?' });
      const winnersList = h('ol', { class: 'winner-list', hidden: true });
      const note = h('p', { class: 'stage-note' }, t('idle'));
      const live = liveRegion();
      const history = createHistory();

      const editor = listEditor({
        label: t('itemsLabel'),
        value: ctx.load('items', hasExample ? example : ''),
        placeholder: t('placeholder'),
        rows: 9,
        onChange: (text) => ctx.save('items', text),
      });
      const count = numberField({ label: t('winners'), value: 1, min: 1, max: 50 });
      const remove = switchField({ label: t('removeAfter'), hint: t('removeHint'), checked: ctx.load('remove', false), onChange: (v) => ctx.save('remove', v) });

      const draw = button({
        label: t('draw'),
        icon,
        variant: 'primary',
        size: 'lg',
        onClick: () =>
          whileBusy(draw, async () => {
            const items = editor.items();
            const n = count.get() ?? 1;
            note.classList.remove('is-error');
            if (items.length < 2 || n > items.length) {
              note.textContent = items.length < 2 ? ctx.t('needItems', { n: 2 }) : t('tooFew');
              note.classList.add('is-error');
              return;
            }
            note.textContent = '';
            const winners = n === 1 ? [pick(items)] : sample(items, n);

            if (n === 1) {
              winnersList.hidden = true;
              reel.el.hidden = false;
              const sequence = [];
              let previous = null;
              for (let i = 0; i < 22; i++) {
                let candidate = items[randomBelow(items.length)];
                if (candidate === previous && items.length > 1) candidate = items[(items.indexOf(candidate) + 1) % items.length];
                sequence.push({ text: candidate });
                previous = candidate;
              }
              sequence.push({ text: winners[0], tone: 'win' });
              await reel.spin(sequence);
            } else {
              reel.el.hidden = true;
              winnersList.hidden = false;
              winnersList.replaceChildren();
              for (const [i, name] of winners.entries()) {
                const row = h('li', { class: 'winner-item', title: name }, h('span', { class: 'winner-rank' }, String(i + 1)), h('span', { class: 'winner-name' }, name));
                row.style.animationDelay = `${i * 90}ms`;
                winnersList.append(row);
                await sleep(90);
              }
            }

            live.textContent = winners.join(', ');
            history.add(winners.join(', '));
            if (remove.get()) {
              const rest = items.filter((item) => !winners.includes(item));
              editor.set(rest.join('\n'));
            }
          }),
      });

      const reset = hasExample ? button({ label: t('reset'), variant: 'ghost', size: 'sm', onClick: () => editor.set(example) }) : null;

      root.append(
        h(
          'div',
          { class: 'stage-col' },
          h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, reel.el, winnersList, note, live), h('div', { class: 'stage-actions' }, draw, copyButton(() => history.el.querySelector('.history-item')?.textContent ?? ''))),
          history.el,
        ),
        h('div', { class: 'controls-col' }, panel(null, editor.el, reset, count.el, remove.el)),
      );
    },
  };
}

export default createPickerTool({
  id: 'picker',
  icon: 'picker',
  messages: {
    de: {
      title: 'Zufallsauswahl',
      desc: 'Zieht einen oder mehrere Einträge aus deiner eigenen Liste.',
      keywords: 'liste losen ziehen auswahl gewinner wer namen',
      placeholder: 'Anna\nBen\nChiara',
      example: 'Anna\nBen\nChiara\nDavid\nEmma',
    },
    en: {
      title: 'Random picker',
      desc: 'Draws one or more entries from your own list.',
      keywords: 'list draw pick winner who names',
      placeholder: 'Anna\nBen\nChiara',
      example: 'Anna\nBen\nChiara\nDavid\nEmma',
    },
  },
});

