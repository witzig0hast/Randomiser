import { h } from '../dom.js';
import { shuffle } from '../lib/random.js';
import { sleep } from '../motion.js';
import { button, copyButton, listEditor, liveRegion, panel, whileBusy } from '../ui.js';

export default {
  id: 'order',
  category: 'groups',
  icon: 'order',
  messages: {
    de: { title: 'Reihenfolge', desc: 'Mischt eine Liste, z. B. wer als Erstes dran ist.', keywords: 'mischen reihe sortieren wer fängt an rangfolge shuffle', go: 'Reihenfolge auslosen', idle: 'Trage Namen ein und mische sie.' },
    en: { title: 'Random order', desc: 'Shuffles a list, e.g. who goes first.', keywords: 'shuffle sort sequence who starts ranking', go: 'Draw order', idle: 'Enter names and shuffle them.' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const list = h('ol', { class: 'order-list' });
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    let last = '';

    const editor = listEditor({ label: t('itemsLabel'), value: ctx.load('items', ['Anna', 'Ben', 'Chiara', 'David', 'Emma'].join('\n')), placeholder: 'Anna\nBen\nChiara', rows: 9, maxItems: 100, onChange: (v) => ctx.save('items', v) });

    const go = button({
      label: t('go'),
      icon: 'order',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const items = editor.items();
          note.classList.remove('is-error');
          if (items.length < 2) {
            note.textContent = ctx.t('needItems', { n: 2 });
            note.classList.add('is-error');
            return;
          }
          note.textContent = '';
          list.replaceChildren();
          const ordered = shuffle(items);
          for (const [i, name] of ordered.entries()) {
            list.append(h('li', { class: 'order-item', title: name }, h('span', { class: 'order-rank' }, String(i + 1)), h('span', { class: 'order-name' }, name)));
            await sleep(Math.min(130, 900 / ordered.length));
          }
          last = ordered.map((n, i) => `${i + 1}. ${n}`).join('\n');
          live.textContent = ordered.join(', ');
        }),
    });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage is-top' }, h('div', { class: 'stage-display is-stretch' }, list, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => last)))),
      h('div', { class: 'controls-col' }, panel(null, editor.el)),
    );
  },
};
