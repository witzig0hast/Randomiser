import { h } from '../dom.js';
import { uniqueInts } from '../lib/random.js';
import { sleep } from '../motion.js';
import { button, copyButton, createHistory, liveRegion, panel, segmented, stepper, whileBusy } from '../ui.js';

const PRESETS = {
  lotto: { pick: 6, from: 49, extra: { count: 1, min: 0, max: 9 } },
  euro: { pick: 5, from: 50, extra: { count: 2, min: 1, max: 12 } },
};

export default {
  id: 'lottery',
  category: 'numbers',
  icon: 'lottery',
  messages: {
    de: {
      title: 'Lottozahlen',
      desc: 'Zahlen ohne Wiederholung, z. B. 6 aus 49 oder Eurojackpot.',
      keywords: 'lotto eurojackpot ziehung tipp superzahl kugeln',
      go: 'Zahlen ziehen',
      preset: 'Spielart',
      lotto: 'Lotto 6 aus 49',
      euro: 'Eurojackpot',
      custom: 'Eigene',
      pick: 'Zahlen ziehen',
      from: 'aus 1 bis …',
      extraCount: 'Zusatzzahlen',
      extraMax: 'Zusatz: 1 bis …',
      idle: 'Wähle eine Spielart und ziehe deine Zahlen.',
      lottoExtra: 'Superzahl',
      euroExtra: 'Eurozahlen',
      customExtra: 'Zusatz',
      disclaimer: 'Hinweis: Das ist ein Zufallsgenerator, kein Spielschein. Gewinnchancen ändern sich dadurch nicht.',
    },
    en: {
      title: 'Lottery numbers',
      desc: 'Numbers without repeats, e.g. 6 from 49 or Eurojackpot.',
      keywords: 'lotto eurojackpot draw ticket pick balls',
      go: 'Draw numbers',
      preset: 'Game',
      lotto: 'Lotto 6 of 49',
      euro: 'Eurojackpot',
      custom: 'Custom',
      pick: 'Numbers to draw',
      from: 'from 1 to …',
      extraCount: 'Bonus numbers',
      extraMax: 'Bonus: 1 to …',
      idle: 'Choose a game and draw your numbers.',
      lottoExtra: 'Super number',
      euroExtra: 'Euro numbers',
      customExtra: 'Bonus',
      disclaimer: 'Note: This is a random generator, not a ticket. It does not change your odds.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const board = h('div', { class: 'ball-board' });
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory({ max: 8 });
    let last = '';

    const preset = segmented({
      label: t('preset'),
      options: [
        { value: 'lotto', label: t('lotto') },
        { value: 'euro', label: t('euro') },
        { value: 'custom', label: t('custom') },
      ],
      value: ctx.load('preset', 'lotto'),
      onChange: (v) => {
        ctx.save('preset', v);
        sync();
      },
    });
    const pickN = stepper({ label: t('pick'), value: ctx.load('pick', 6), min: 1, max: 20, onChange: (v) => (ctx.save('pick', v), clampFrom()) });
    const fromN = stepper({ label: t('from'), value: ctx.load('from', 49), min: 2, max: 99, onChange: () => (ctx.save('from', fromN.get()), clampFrom()) });
    const extraCount = stepper({ label: t('extraCount'), value: ctx.load('extraCount', 0), min: 0, max: 5, onChange: () => (ctx.save('extraCount', extraCount.get()), sync()) });
    const extraMax = stepper({ label: t('extraMax'), value: ctx.load('extraMax', 10), min: 1, max: 99, onChange: () => (ctx.save('extraMax', extraMax.get()), sync()) });
    const customFields = h('div', { class: 'panel-stack' }, h('div', { class: 'form-grid' }, pickN.el, fromN.el), h('div', { class: 'form-grid' }, extraCount.el, extraMax.el));

    function clampFrom() {
      if (fromN.get() < pickN.get()) fromN.set(pickN.get());
      sync();
    }

    function config() {
      const key = preset.get();
      if (key !== 'custom') return PRESETS[key];
      const count = Math.min(extraCount.get(), extraMax.get());
      return { pick: pickN.get(), from: Math.max(fromN.get(), pickN.get()), extra: count > 0 ? { count, min: 1, max: extraMax.get() } : null };
    }

    function sync() {
      customFields.hidden = preset.get() !== 'custom';
      note.textContent = t('idle');
    }

    const go = button({
      label: t('go'),
      icon: 'lottery',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const c = config();
          const main = uniqueInts(1, c.from, c.pick).sort((a, b) => a - b);
          const extra = c.extra ? uniqueInts(c.extra.min, c.extra.max, c.extra.count).sort((a, b) => a - b) : [];
          const extraName = t(`${preset.get()}Extra`);
          board.replaceChildren();
          note.textContent = '';
          const addBall = async (value, cls, index) => {
            const ball = h('span', { class: `lotto-ball ${cls}` }, String(value));
            board.append(ball);
            await sleep(index === 0 ? 40 : 230);
          };
          for (const [i, v] of main.entries()) await addBall(v, '', i);
          if (extra.length) {
            board.append(h('span', { class: 'lotto-plus', 'aria-hidden': 'true' }, '+'));
            for (const v of extra) await addBall(v, 'is-extra', 1);
            note.textContent = extraName;
          }
          last = `${main.join(', ')}${extra.length ? ` + ${extra.join(', ')}` : ''}`;
          live.textContent = last;
          history.add(last.replaceAll(', ', ' · '));
        }),
    });

    sync();
    root.append(
      h(
        'div',
        { class: 'stage-col' },
        h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, board, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => last))),
        history.el,
      ),
      h('div', { class: 'controls-col' }, panel(null, preset.el, customFields, h('p', { class: 'field-hint' }, t('disclaimer')))),
    );
  },
};
