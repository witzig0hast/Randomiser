import { h } from '../dom.js';
import { hslToRgb, readableOn } from '../lib/color.js';
import { randomBelow, randomFloat } from '../lib/random.js';
import { tween, easeOutQuart } from '../motion.js';
import { button, createHistory, listEditor, liveRegion, panel, switchField, whileBusy } from '../ui.js';

const MAX_ITEMS = 40;
const HUES = [18, 200, 48, 262, 150, 340, 85, 225, 28, 175, 305, 120];
const TAU = Math.PI * 2;

const segmentColor = (i, n) => {
  // Bei ungerader Restzahl bekommt das letzte Segment eine abweichende Helligkeit, damit es nicht an Segment 0 grenzt.
  const lightness = n % HUES.length === 1 && i === n - 1 ? 42 : 52;
  return hslToRgb(HUES[i % HUES.length], 62, lightness);
};

export default {
  id: 'wheel',
  category: 'decide',
  icon: 'wheel',
  messages: {
    de: {
      title: 'Glücksrad',
      desc: 'Ein Rad mit deinen Feldern. Drehen und gewinnen lassen.',
      keywords: 'rad drehen losen gewinnspiel',
      spin: 'Drehen',
      removeWinner: 'Gewinner nach dem Dreh entfernen',
      idle: 'Trage mindestens zwei Felder ein und drehe das Rad.',
      limit: 'Es werden höchstens {n} Felder verwendet.',
      aria: 'Glücksrad mit {n} Feldern',
    },
    en: {
      title: 'Wheel of fortune',
      desc: 'A wheel with your own segments. Spin it and let it decide.',
      keywords: 'spin wheel draw prize raffle',
      spin: 'Spin',
      removeWinner: 'Remove the winner after the spin',
      idle: 'Enter at least two segments and spin the wheel.',
      limit: 'At most {n} segments are used.',
      aria: 'Wheel of fortune with {n} segments',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    let items = [];
    let rotation = 0;
    let sprite = null;

    const canvas = h('canvas', { class: 'wheel-canvas', role: 'img' });
    const wrap = h('div', { class: 'wheel-wrap' }, canvas, h('div', { class: 'wheel-pointer', 'aria-hidden': 'true' }));
    const result = h('p', { class: 'wheel-result' }, ' ');
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();

    // Das Rad wird einmal in ein Offscreen-Canvas gezeichnet und beim Drehen nur noch rotiert eingeblendet.
    function renderSprite() {
      const size = canvas.width;
      sprite = null;
      if (!size || items.length < 2) return;
      const off = document.createElement('canvas');
      off.width = off.height = size;
      const g = off.getContext('2d');
      const c = size / 2;
      const radius = c - size * 0.012;
      const step = TAU / items.length;
      const fontPx = Math.max(11, Math.min(size * 0.045, (radius * 1.1) / Math.max(items.length * 0.55, 8) + size * 0.02));
      g.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
      g.textBaseline = 'middle';
      items.forEach((label, i) => {
        const [r, gr, b] = segmentColor(i, items.length);
        const start = -Math.PI / 2 + i * step;
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, radius, start, start + step);
        g.closePath();
        g.fillStyle = `rgb(${r} ${gr} ${b})`;
        g.fill();
        g.lineWidth = Math.max(1.5, size * 0.004);
        g.strokeStyle = 'rgb(255 255 255 / 0.85)';
        g.stroke();

        g.save();
        g.translate(c, c);
        g.rotate(start + step / 2);
        g.fillStyle = readableOn(r, gr, b);
        g.textAlign = 'right';
        const maxWidth = radius * 0.72;
        let text = label;
        while (text.length > 1 && g.measureText(text).width > maxWidth) text = text.slice(0, -1);
        if (text !== label) text = `${text.trimEnd()}…`;
        g.fillText(text, radius - size * 0.045, 0);
        g.restore();
      });
      sprite = off;
    }

    function paint() {
      const size = canvas.width;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, size, size);
      if (!sprite) {
        // Platzhalter, solange weniger als zwei Felder vorhanden sind
        const c = size / 2;
        g.beginPath();
        g.arc(c, c, c - size * 0.012, 0, TAU);
        g.fillStyle = getComputedStyle(canvas).borderTopColor;
        g.fill();
        return;
      }
      g.save();
      g.translate(size / 2, size / 2);
      g.rotate(rotation);
      g.drawImage(sprite, -size / 2, -size / 2);
      g.restore();
      // Nabe
      g.beginPath();
      g.arc(size / 2, size / 2, size * 0.045, 0, TAU);
      g.fillStyle = getComputedStyle(canvas).color;
      g.fill();
    }

    function indexAt(angle) {
      const step = TAU / items.length;
      const a = (((-angle) % TAU) + TAU) % TAU;
      return Math.min(items.length - 1, Math.floor(a / step));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const px = Math.max(1, Math.round(canvas.clientWidth * dpr));
      if (canvas.width !== px) {
        canvas.width = canvas.height = px;
        redraw();
      }
    }

    function redraw() {
      sprite = null;
      if (canvas.width) {
        renderSprite();
        paint();
      }
    }

    const editor = listEditor({
      label: t('itemsLabel'),
      value: ctx.load('items', ['Anna', 'Ben', 'Chiara', 'David', 'Emma', 'Felix'].join('\n')),
      placeholder: 'Anna\nBen\nChiara',
      rows: 9,
      maxItems: MAX_ITEMS,
      hint: t('limit', { n: MAX_ITEMS }),
      onChange: (text) => {
        ctx.save('items', text);
        sync();
      },
    });
    const remove = switchField({ label: t('removeWinner'), checked: ctx.load('remove', false), onChange: (v) => ctx.save('remove', v) });

    function sync() {
      items = editor.items();
      canvas.setAttribute('aria-label', t('aria', { n: items.length }));
      redraw();
    }

    const spin = button({
      label: t('spin'),
      icon: 'wheel',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(spin, async () => {
          note.classList.remove('is-error');
          if (items.length < 2) {
            note.textContent = ctx.t('needItems', { n: 2 });
            note.classList.add('is-error');
            return;
          }
          const winner = randomBelow(items.length);
          const step = TAU / items.length;
          const landing = (winner + 0.12 + randomFloat() * 0.76) * step;
          const startRot = rotation;
          const target = (((-landing - startRot) % TAU) + TAU) % TAU;
          const delta = (5 + randomBelow(3)) * TAU + target;
          note.textContent = '';
          result.textContent = ' ';
          await tween(5200, (p) => {
            rotation = startRot + delta * easeOutQuart(p);
            paint();
            if (p < 1) note.textContent = items[indexAt(rotation)];
          });
          rotation = (startRot + delta) % TAU;
          paint();
          const label = items[winner];
          note.textContent = '';
          result.textContent = label;
          live.textContent = label;
          history.add(label);
          if (remove.get()) editor.set(items.filter((_, i) => i !== winner).join('\n'));
        }),
    });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    ctx.onCleanup(() => observer.disconnect());

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, wrap, result, note, live), h('div', { class: 'stage-actions' }, spin)), history.el),
      h('div', { class: 'controls-col' }, panel(null, editor.el, remove.el)),
    );
    sync();
    resize();
  },
};
