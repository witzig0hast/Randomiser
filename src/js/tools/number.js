import { h } from '../dom.js';
import { formatNumber } from '../i18n.js';
import { randomDecimal, randomInt, uniqueInts } from '../lib/random.js';
import { sleep } from '../motion.js';
import { button, copyButton, createHistory, liveRegion, numberField, panel, segmented, stepper, switchField, whileBusy } from '../ui.js';

const LIMIT = 1e15;

export default {
  id: 'number',
  category: 'numbers',
  icon: 'number',
  messages: {
    de: {
      title: 'Zufallszahl',
      desc: 'Eine oder mehrere Zahlen zwischen einem Minimum und Maximum.',
      keywords: 'zahl bereich zwischen minimum maximum generator ganzzahl dezimal',
      go: 'Zahl ziehen',
      min: 'Von',
      max: 'Bis (einschließlich)',
      kind: 'Zahlenart',
      int: 'Ganzzahl',
      decimal: 'Dezimal',
      decimals: 'Nachkommastellen',
      count: 'Anzahl',
      unique: 'Ohne Wiederholung',
      sort: 'Aufsteigend sortieren',
      presets: 'Schnellwahl',
      idle: 'Lege einen Bereich fest und ziehe eine Zahl.',
      errOrder: 'Der Startwert darf nicht größer sein als der Endwert.',
      errUnique: 'Ohne Wiederholung sind höchstens {n} Zahlen möglich.',
      errRange: 'In diesem Bereich liegt keine passende Zahl.',
    },
    en: {
      title: 'Random number',
      desc: 'One or more numbers between a minimum and a maximum.',
      keywords: 'number range between minimum maximum generator integer decimal',
      go: 'Draw number',
      min: 'From',
      max: 'To (inclusive)',
      kind: 'Number type',
      int: 'Integer',
      decimal: 'Decimal',
      decimals: 'Decimal places',
      count: 'Count',
      unique: 'No repeats',
      sort: 'Sort ascending',
      presets: 'Quick range',
      idle: 'Set a range and draw a number.',
      errOrder: 'The start value must not be greater than the end value.',
      errUnique: 'Without repeats, at most {n} numbers are possible.',
      errRange: 'There is no matching number in this range.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const display = h('div', { class: 'number-display' }, h('span', { class: 'big-number is-idle' }, '—'));
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();
    let lastValues = [];

    const min = numberField({ label: t('min'), value: ctx.load('min', 1), min: -LIMIT, max: LIMIT, step: 'any', onChange: (v) => v !== null && ctx.save('min', v) });
    const max = numberField({ label: t('max'), value: ctx.load('max', 100), min: -LIMIT, max: LIMIT, step: 'any', onChange: (v) => v !== null && ctx.save('max', v) });
    const kind = segmented({
      label: t('kind'),
      options: [
        { value: 'int', label: t('int') },
        { value: 'decimal', label: t('decimal') },
      ],
      value: ctx.load('kind', 'int'),
      onChange: (v) => {
        ctx.save('kind', v);
        syncKind();
      },
    });
    const decimals = stepper({ label: t('decimals'), value: ctx.load('decimals', 2), min: 1, max: 8, onChange: (v) => v !== null && ctx.save('decimals', v) });
    const count = stepper({ label: t('count'), value: 1, min: 1, max: 100 });
    const unique = switchField({ label: t('unique'), checked: false });
    const sort = switchField({ label: t('sort'), checked: false });

    const presets = h(
      'div',
      { class: 'field' },
      h('span', { class: 'field-label' }, t('presets')),
      h(
        'div',
        { class: 'chips' },
        [
          [1, 10],
          [1, 100],
          [1, 1000],
          [0, 1],
        ].map(([lo, hi]) =>
          h(
            'button',
            {
              type: 'button',
              class: 'chip',
              onClick: () => {
                min.set(lo);
                max.set(hi);
                ctx.save('min', lo);
                ctx.save('max', hi);
              },
            },
            `${lo}–${hi}`,
          ),
        ),
      ),
    );

    function syncKind() {
      const isInt = kind.get() === 'int';
      decimals.el.hidden = isInt;
      unique.el.hidden = !isInt;
      if (!isInt) unique.set(false);
    }

    const fmt = (v) => (kind.get() === 'int' ? formatNumber(v, { maximumFractionDigits: 0 }) : formatNumber(v, { minimumFractionDigits: decimals.get(), maximumFractionDigits: decimals.get() }));
    const raw = (v) => (kind.get() === 'int' ? String(v) : v.toFixed(decimals.get()));

    function draw() {
      let lo = min.get();
      let hi = max.get();
      if (lo === null || hi === null) return { error: ctx.t('invalid') };
      if (lo > hi) return { error: t('errOrder') };
      const n = count.get();
      try {
        if (kind.get() === 'int') {
          lo = Math.ceil(lo);
          hi = Math.floor(hi);
          if (lo > hi) return { error: t('errRange') };
          if (unique.get()) {
            const size = hi - lo + 1;
            if (n > size) return { error: t('errUnique', { n: formatNumber(size) }) };
            return { values: uniqueInts(lo, hi, n) };
          }
          return { values: Array.from({ length: n }, () => randomInt(lo, hi)) };
        }
        return { values: Array.from({ length: n }, () => randomDecimal(lo, hi, decimals.get())) };
      } catch {
        return { error: t('errRange') };
      }
    }

    function flicker(el) {
      const lo = Math.ceil(min.get()), hi = Math.floor(max.get());
      return async () => {
        for (let i = 0; i < 9; i++) {
          el.textContent = fmt(kind.get() === 'int' ? randomInt(lo, Math.max(lo, hi)) : randomDecimal(min.get(), max.get(), decimals.get()));
          await sleep(55 + i * 14);
        }
      };
    }

    const go = button({
      label: t('go'),
      icon: 'number',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          note.classList.remove('is-error');
          const { values, error } = draw();
          if (error) {
            note.textContent = error;
            note.classList.add('is-error');
            return;
          }
          note.textContent = '';
          const list = sort.get() ? values.slice().sort((a, b) => a - b) : values;
          lastValues = list;
          if (list.length === 1) {
            const big = h('span', { class: 'big-number' }, '');
            display.replaceChildren(big);
            await flicker(big)();
            big.textContent = fmt(list[0]);
            big.classList.add('is-final');
          } else {
            const grid = h('ol', { class: 'number-grid' });
            display.replaceChildren(grid);
            for (const [i, v] of list.entries()) {
              const chip = h('li', { class: 'number-chip' }, fmt(v));
              chip.style.animationDelay = `${Math.min(i, 30) * 25}ms`;
              grid.append(chip);
            }
            await sleep(Math.min(list.length, 30) * 25 + 200);
          }
          const text = list.map(fmt).join(', ');
          live.textContent = text;
          history.add(list.length > 4 ? `${list.slice(0, 4).map(fmt).join(', ')} …` : text);
        }),
    });

    syncKind();
    root.append(
      h(
        'div',
        { class: 'stage-col' },
        h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, display, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => lastValues.map(raw).join(', ')))),
        history.el,
      ),
      h('div', { class: 'controls-col' }, panel(null, h('div', { class: 'form-grid' }, min.el, max.el), presets, kind.el, decimals.el, count.el, unique.el, sort.el)),
    );
  },
};
