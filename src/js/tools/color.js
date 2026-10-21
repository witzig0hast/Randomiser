import { h } from '../dom.js';
import { hslToRgb, readableOn, rgbToHex, rgbToHsl } from '../lib/color.js';
import { pick, randomInt } from '../lib/random.js';
import { button, copyText, createHistory, iconButton, panel, segmented } from '../ui.js';

const COUNT = 5;
const SCHEMES = [
  [0, 30, 60, -30, -60], // analog
  [0, 120, 240, 60, 180], // Dreiklang plus
  [0, 180, 20, 200, -20], // komplementär
  [0, 150, 210, 30, 330], // gespalten komplementär
];

function randomColor(mode, base, offset) {
  if (mode === 'random') return [randomInt(0, 255), randomInt(0, 255), randomInt(0, 255)];
  const hue = (base + offset + 360) % 360;
  return hslToRgb(hue, randomInt(48, 82), randomInt(38, 72));
}

function format(rgb, kind) {
  if (kind === 'rgb') return `rgb(${rgb.join(', ')})`;
  if (kind === 'hsl') {
    const [hh, ss, ll] = rgbToHsl(...rgb);
    return `hsl(${hh}, ${ss}%, ${ll}%)`;
  }
  return rgbToHex(...rgb);
}

export default {
  id: 'color',
  category: 'text',
  icon: 'color',
  messages: {
    de: {
      title: 'Zufallsfarben',
      desc: 'Farbpaletten per Zufall, mit Sperren und Kopieren.',
      keywords: 'farbe palette hex rgb hsl design colour',
      go: 'Neue Palette',
      mode: 'Modus',
      harmonic: 'Harmonisch',
      pure: 'Rein zufällig',
      format: 'Format',
      lock: 'Farbe sperren',
      unlock: 'Farbe entsperren',
      copy: 'Farbwert kopieren',
      hint: 'Klicke auf einen Farbwert, um ihn zu kopieren. Gesperrte Farben bleiben beim Neuziehen erhalten.',
    },
    en: {
      title: 'Random colors',
      desc: 'Random color palettes with locking and copying.',
      keywords: 'colour palette hex rgb hsl design',
      go: 'New palette',
      mode: 'Mode',
      harmonic: 'Harmonious',
      pure: 'Purely random',
      format: 'Format',
      lock: 'Lock color',
      unlock: 'Unlock color',
      copy: 'Copy color value',
      hint: 'Click a color value to copy it. Locked colors stay when you draw again.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const colors = Array(COUNT).fill(null);
    const locked = Array(COUNT).fill(false);
    const history = createHistory({ max: 6 });

    const strip = h('div', { class: 'swatches' });
    const mode = segmented({
      label: t('mode'),
      options: [
        { value: 'harmonic', label: t('harmonic') },
        { value: 'pure', label: t('pure') },
      ],
      value: ctx.load('mode', 'harmonic'),
      onChange: (v) => ctx.save('mode', v),
    });
    const kind = segmented({
      label: t('format'),
      options: ['hex', 'rgb', 'hsl'].map((value) => ({ value, label: value.toUpperCase() })),
      value: ctx.load('format', 'hex'),
      onChange: (v) => (ctx.save('format', v), render()),
    });

    const swatches = Array.from({ length: COUNT }, (_, i) => {
      const value = h('button', { type: 'button', class: 'swatch-value', title: t('copy'), onClick: () => copyText(format(colors[i], kind.get())) });
      const lock = iconButton({ label: t('lock'), icon: 'unlock', class: 'swatch-lock', onClick: () => toggleLock(i) });
      const el = h('div', { class: 'swatch' }, h('div', { class: 'swatch-top' }, lock), value);
      return { el, value, lock };
    });
    strip.append(...swatches.map((s) => s.el));

    function toggleLock(i) {
      locked[i] = !locked[i];
      render();
    }

    function render() {
      swatches.forEach((sw, i) => {
        const rgb = colors[i];
        if (!rgb) return;
        sw.el.style.backgroundColor = `rgb(${rgb.join(' ')})`;
        sw.el.style.color = readableOn(...rgb);
        sw.value.textContent = format(rgb, kind.get());
        sw.el.classList.toggle('is-locked', locked[i]);
        const label = locked[i] ? t('unlock') : t('lock');
        sw.lock.title = label;
        sw.lock.setAttribute('aria-label', label);
        sw.lock.replaceChildren();
        sw.lock.append(h('span', { class: 'swatch-lock-icon' }, locked[i] ? '●' : '○'));
      });
    }

    function generate() {
      const base = randomInt(0, 359);
      const scheme = pick(SCHEMES);
      colors.forEach((_, i) => {
        if (!locked[i]) colors[i] = randomColor(mode.get(), base, scheme[i]);
      });
      render();
      history.add(colors.map((c) => rgbToHex(...c)).join(' '));
    }

    const go = button({ label: t('go'), icon: 'refresh', variant: 'primary', size: 'lg', onClick: generate });

    root.classList.add('is-single');
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage is-flush' }, strip, h('div', { class: 'stage-actions pad' }, go)), h('p', { class: 'field-hint' }, t('hint')), panel(null, h('div', { class: 'form-grid' }, mode.el, kind.el)), history.el),
    );
    generate();
    history.clear();
  },
};
