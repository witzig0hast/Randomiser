import { h, s } from '../dom.js';
import { formatNumber } from '../i18n.js';
import { randomDecimal } from '../lib/random.js';
import { easeOutCubic, tween } from '../motion.js';
import { button, createHistory, liveRegion, segmented, whileBusy } from '../ui.js';

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default {
  id: 'percent',
  category: 'numbers',
  icon: 'percent',
  messages: {
    de: { title: 'Zufallsprozent', desc: 'Ein zufälliger Prozentwert von 0 bis 100.', keywords: 'prozent wahrscheinlichkeit chance quote', go: 'Prozent ziehen', precision: 'Genauigkeit', whole: 'ganz', one: '1 Stelle', two: '2 Stellen', idle: 'Ziehe einen Prozentwert.' },
    en: { title: 'Random percentage', desc: 'A random percentage from 0 to 100.', keywords: 'percent probability chance rate', go: 'Draw percentage', precision: 'Precision', whole: 'whole', one: '1 place', two: '2 places', idle: 'Draw a percentage.' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const value = h('span', { class: 'gauge-value' }, '—');
    const arc = s('circle', { cx: 100, cy: 100, r: RADIUS, fill: 'none', 'stroke-width': 14, 'stroke-linecap': 'round', class: 'gauge-arc', 'stroke-dasharray': CIRCUMFERENCE, 'stroke-dashoffset': CIRCUMFERENCE, transform: 'rotate(-90 100 100)' });
    const gauge = h('div', { class: 'gauge' }, s('svg', { viewBox: '0 0 200 200', 'aria-hidden': 'true' }, s('circle', { cx: 100, cy: 100, r: RADIUS, fill: 'none', 'stroke-width': 14, class: 'gauge-track' }), arc), h('div', { class: 'gauge-label' }, value));
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    const precision = segmented({
      label: t('precision'),
      options: [
        { value: 0, label: t('whole') },
        { value: 1, label: t('one') },
        { value: 2, label: t('two') },
      ],
      value: ctx.load('precision', 0),
      onChange: (v) => ctx.save('precision', v),
      hideLabel: true,
    });

    const fmt = (v, d) => `${formatNumber(v, { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

    const go = button({
      label: t('go'),
      icon: 'percent',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const d = Number(precision.get());
          const result = randomDecimal(0, 100, d);
          note.textContent = '';
          await tween(1500, (p) => {
            const shown = result * easeOutCubic(p);
            arc.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - shown / 100)));
            value.textContent = fmt(shown, d);
          });
          arc.setAttribute('stroke-dashoffset', String(CIRCUMFERENCE * (1 - result / 100)));
          value.textContent = fmt(result, d);
          live.textContent = fmt(result, d);
          history.add(fmt(result, d));
        }),
    });

    root.classList.add('is-single');
    root.append(h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, gauge, note, live), h('div', { class: 'stage-actions' }, precision.el, go)), history.el));
  },
};
