import { h } from '../dom.js';
import { randomInt, rollDice } from '../lib/random.js';
import { dur, play, settle, sleep } from '../motion.js';
import { button, createHistory, liveRegion, numberField, panel, segmented, stepper, whileBusy } from '../ui.js';

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const SIDES = [4, 6, 8, 10, 12, 20, 100];

function setFace(die, sides, value) {
  die.dataset.value = String(value);
  die.classList.toggle('is-long', String(value).length >= 3);
  if (sides === 6) {
    die.replaceChildren(...Array.from({ length: 9 }, (_, i) => h('span', { class: PIPS[value].includes(i) ? 'pip' : 'pip is-off' })));
  } else {
    die.textContent = String(value);
  }
}

export default {
  id: 'dice',
  category: 'numbers',
  icon: 'dice',
  messages: {
    de: {
      title: 'Würfel',
      desc: 'Von W4 bis W100, mehrere Würfel und Modifikator.',
      keywords: 'würfeln w6 w20 d20 rollenspiel dnd pen and paper augen',
      roll: 'Würfeln',
      type: 'Würfeltyp',
      custom: 'Eigene Seitenzahl',
      count: 'Anzahl der Würfel',
      mod: 'Modifikator',
      letter: 'W',
      total: 'Summe',
      idle: 'Wähle deine Würfel und würfle.',
    },
    en: {
      title: 'Dice',
      desc: 'From d4 to d100, multiple dice and a modifier.',
      keywords: 'roll d6 d20 rpg dnd tabletop pips',
      roll: 'Roll',
      type: 'Die type',
      custom: 'Custom number of sides',
      count: 'Number of dice',
      mod: 'Modifier',
      letter: 'd',
      total: 'Total',
      idle: 'Pick your dice and roll.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const stored = ctx.load('sides', 6);
    let sides = stored;

    const tray = h('div', { class: 'dice-tray' });
    const totalEl = h('p', { class: 'dice-total' }, ' ');
    const detail = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    const type = segmented({
      label: t('type'),
      options: SIDES.map((n) => ({ value: n, label: `${t('letter')}${n}` })),
      value: SIDES.includes(sides) ? sides : null,
      onChange: (v) => {
        sides = v;
        custom.set(v);
        ctx.save('sides', v);
        preview();
      },
    });
    const custom = numberField({
      label: t('custom'),
      value: sides,
      min: 2,
      max: 1000,
      onChange: (v) => {
        if (v === null) return;
        sides = Math.round(v);
        SIDES.includes(sides) ? type.set(sides) : type.set(null);
        ctx.save('sides', sides);
        preview();
      },
    });
    const count = stepper({ label: t('count'), value: ctx.load('count', 2), min: 1, max: 12, onChange: () => (ctx.save('count', count.get()), preview()) });
    const mod = numberField({ label: t('mod'), value: ctx.load('mod', 0), min: -999, max: 999, onChange: (v) => (v !== null && ctx.save('mod', Math.round(v)), preview()) });

    const notation = () => {
      const m = Math.round(mod.get() ?? 0);
      return `${count.get()}${t('letter')}${sides}${m ? (m > 0 ? `+${m}` : `${m}`) : ''}`;
    };

    function buildDice(values) {
      tray.replaceChildren(
        ...values.map((v, i) => {
          const die = h('div', { class: 'die', dataset: { sides: String(sides) } });
          setFace(die, sides, v);
          return h('div', { class: 'die-wrap', dataset: { i: String(i) } }, die);
        }),
      );
    }

    // Ruhezustand: jeder Würfel zeigt seine höchste Seite, darunter die Notation
    function preview() {
      buildDice(Array(count.get()).fill(sides));
      totalEl.textContent = '\u00a0';
      detail.textContent = notation();
    }

    const roll = button({
      label: t('roll'),
      icon: 'dice',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(roll, async () => {
          const n = count.get();
          const m = Math.round(mod.get() ?? 0);
          const values = rollDice(n, sides);
          const total = values.reduce((a, b) => a + b, 0) + m;
          buildDice(values.map(() => 1));
          totalEl.textContent = ' ';
          detail.textContent = '';
          const wraps = [...tray.children];
          await Promise.all(
            wraps.map(async (wrap, i) => {
              const die = wrap.firstElementChild;
              const side = i % 2 ? 1 : -1;
              const time = dur(900 + i * 70);
              const anim = play(
                wrap,
                [
                  { transform: `translateY(-26px) rotate(${side * -200}deg) scale(0.85)`, opacity: 0.2 },
                  { transform: `translateY(8px) rotate(${side * 20}deg) scale(1.04)`, opacity: 1, offset: 0.55 },
                  { transform: `translateY(-6px) rotate(${side * -8}deg) scale(1)`, offset: 0.78 },
                  { transform: 'translateY(0) rotate(0) scale(1)' },
                ],
                { duration: time, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
              );
              const end = performance.now() + time * 0.85;
              while (performance.now() < end) {
                setFace(die, sides, randomInt(1, sides));
                await sleep(62);
              }
              await anim;
              setFace(die, sides, values[i]);
              settle(wrap);
            }),
          );
          totalEl.textContent = String(total);
          detail.textContent = n > 1 || m ? `${values.join(' + ')}${m ? ` ${m > 0 ? '+' : '−'} ${Math.abs(m)}` : ''}` : '';
          live.textContent = `${t('total')}: ${total}`;
          history.add(`${notation()} = ${total}`);
        }),
    });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, tray, totalEl, detail, live), h('div', { class: 'stage-actions' }, roll)), history.el),
      h('div', { class: 'controls-col' }, panel(null, type.el, custom.el, h('div', { class: 'form-grid' }, count.el, mod.el))),
    );
    preview();
  },
};
