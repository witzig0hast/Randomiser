import { h } from '../dom.js';
import { chance } from '../lib/random.js';
import { createReel } from '../reel.js';
import { button, createHistory, liveRegion, panel, slider, whileBusy } from '../ui.js';

export default {
  id: 'yesno',
  category: 'decide',
  icon: 'yesno',
  messages: {
    de: {
      title: 'Ja oder Nein',
      desc: 'Eine klare Antwort auf jede Entscheidungsfrage.',
      keywords: 'entscheidung frage orakel',
      go: 'Entscheiden',
      chance: 'Chance auf „Ja“',
      yes: 'Ja',
      no: 'Nein',
      idle: 'Stell dir eine Frage, die sich mit Ja oder Nein beantworten lässt.',
      hint: 'Bei 50 % ist die Entscheidung fair. Verschiebe den Regler, wenn du eine Tendenz möchtest.',
    },
    en: {
      title: 'Yes or No',
      desc: 'A clear answer to any decision.',
      keywords: 'decision question oracle',
      go: 'Decide',
      chance: 'Chance of “Yes”',
      yes: 'Yes',
      no: 'No',
      idle: 'Ask a question that can be answered with yes or no.',
      hint: 'At 50 % the decision is fair. Move the slider if you want a bias.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const reel = createReel({ text: '?' });
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    const odds = slider({
      label: t('chance'),
      min: 0,
      max: 100,
      step: 5,
      value: ctx.load('chance', 50),
      format: (v) => `${v} %`,
      onInput: (v) => ctx.save('chance', v),
    });

    const go = button({
      label: t('go'),
      icon: 'yesno',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const yes = chance(odds.get());
          const result = { text: yes ? t('yes') : t('no'), tone: yes ? 'yes' : 'no' };
          const other = { text: yes ? t('no') : t('yes'), tone: yes ? 'no' : 'yes' };
          const length = 24;
          // abwechselnd Ja/Nein, die letzte Position ist das Ergebnis
          const sequence = Array.from({ length }, (_, i) => ((length - 1 - i) % 2 === 0 ? result : other));
          note.textContent = '';
          await reel.spin(sequence);
          note.textContent = '';
          live.textContent = result.text;
          history.add(result.text);
        }),
    });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, reel.el, note, live), h('div', { class: 'stage-actions' }, go)), history.el),
      h('div', { class: 'controls-col' }, panel(null, odds.el, h('p', { class: 'field-hint' }, t('hint')))),
    );
  },
};
