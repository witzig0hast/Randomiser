import { h } from './dom.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { parseList } from './lib/random.js';

let uidCounter = 0;
export const uid = (prefix = 'id') => `${prefix}-${++uidCounter}`;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ---------------------------------------------------------------- Rückmeldung

let toastTimer;
/** Kurze Statusmeldung am unteren Rand (auch für Screenreader). */
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

/** Kopiert Text in die Zwischenablage (mit Fallback für ältere Browser). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h('textarea', { class: 'sr-only', value: text, readOnly: true, 'aria-hidden': 'true', tabIndex: -1 });
    document.body.append(area);
    area.select();
    try {
      document.execCommand('copy');
    } finally {
      area.remove();
    }
  }
  toast(t('common.copied'));
}

// ---------------------------------------------------------------- Bedienelemente

/** Button. `variant`: primary | secondary | ghost. */
export function button({ label, icon: iconName, variant = 'secondary', size, onClick, title, type = 'button', class: cls = '' }) {
  const classes = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', cls].filter(Boolean).join(' ');
  return h(
    'button',
    { type, class: classes, onClick, title },
    iconName ? icon(iconName, { size: size === 'lg' ? 22 : 18 }) : null,
    label ? h('span', { class: 'btn-label' }, label) : null,
  );
}

/** Icon-Button ohne sichtbaren Text (Label ist für Screenreader und Tooltip). */
export function iconButton({ label, icon: iconName, onClick, class: cls = '' }) {
  return h('button', { type: 'button', class: `icon-btn ${cls}`.trim(), onClick, title: label, 'aria-label': label }, icon(iconName, { size: 18 }));
}

/** Sperrt Buttons, solange `task` läuft. */
export async function whileBusy(buttons, task) {
  const list = [buttons].flat();
  list.forEach((b) => {
    b.disabled = true;
    b.setAttribute('aria-busy', 'true');
  });
  try {
    return await task();
  } finally {
    list.forEach((b) => {
      b.disabled = false;
      b.removeAttribute('aria-busy');
    });
  }
}

/** Beschriftetes Formularfeld. `control` ist ein Element mit `id` oder wird mit einer versehen. */
export function field(label, control, { hint, class: cls = '' } = {}) {
  if (!control.id) control.id = uid('f');
  return h(
    'div',
    { class: `field ${cls}`.trim() },
    h('label', { class: 'field-label', for: control.id }, label),
    control,
    hint ? h('p', { class: 'field-hint' }, hint) : null,
  );
}

/**
 * Zahlenfeld. `get()` liefert die auf [min, max] begrenzte Zahl oder `null`, solange das Feld leer ist.
 * Beim Verlassen wird der Wert korrigiert angezeigt.
 */
export function numberField({ label, value, min, max, step = 1, hint, onChange, suffix, class: cls = '' }) {
  const input = h('input', { class: 'input', type: 'number', inputMode: step % 1 === 0 ? 'numeric' : 'decimal', value, min, max, step });
  const read = () => {
    const n = input.valueAsNumber;
    if (!Number.isFinite(n)) return null;
    return clamp(n, min ?? -Infinity, max ?? Infinity);
  };
  input.addEventListener('input', () => onChange?.(read()));
  input.addEventListener('change', () => {
    const n = read();
    if (n !== null) input.value = String(n);
    onChange?.(n);
  });
  const control = suffix ? h('div', { class: 'input-group' }, input, h('span', { class: 'input-suffix' }, suffix)) : input;
  const el = field(label, input, { hint, class: cls });
  if (suffix) el.querySelector('.field-label').after(control);
  return { el, input, get: read, set: (v) => (input.value = String(v)) };
}

/** Zähler mit −/+-Tasten. */
export function stepper({ label, value, min = 1, max = 99, onChange, class: cls = '' }) {
  const input = h('input', { class: 'input stepper-input', type: 'number', inputMode: 'numeric', value, min, max, step: 1 });
  const read = () => {
    const n = Math.round(input.valueAsNumber);
    return Number.isFinite(n) ? clamp(n, min, max) : null;
  };
  const set = (n) => {
    input.value = String(clamp(n, min, max));
    onChange?.(read());
  };
  const dec = iconButton({ label: t('common.decrease'), icon: 'minus', onClick: () => set((read() ?? min) - 1) });
  const inc = iconButton({ label: t('common.increase'), icon: 'plus', onClick: () => set((read() ?? min) + 1) });
  input.addEventListener('input', () => onChange?.(read()));
  input.addEventListener('change', () => {
    const n = read();
    input.value = String(n ?? min);
    onChange?.(read());
  });
  input.id = uid('f');
  const el = h('div', { class: `field ${cls}`.trim() }, h('label', { class: 'field-label', for: input.id }, label), h('div', { class: 'stepper' }, dec, input, inc));
  return { el, input, get: () => read() ?? min, set: (n) => set(n) };
}

/** Segmentierte Auswahl (Radiogruppe). */
export function segmented({ label, options, value, onChange, hideLabel = false, class: cls = '' }) {
  let current = value ?? options[0].value;
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });
  const buttons = options.map((opt) =>
    h('button', { type: 'button', class: 'segmented-item', role: 'radio', dataset: { value: String(opt.value) }, onClick: () => select(opt.value, true) }, opt.label),
  );
  const paint = () =>
    buttons.forEach((b, i) => {
      const active = String(options[i].value) === String(current);
      b.setAttribute('aria-checked', String(active));
      b.tabIndex = active ? 0 : -1;
      b.classList.toggle('is-active', active);
    });
  function select(v, notify) {
    current = v;
    paint();
    if (notify) onChange?.(v);
  }
  group.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const i = options.findIndex((o) => String(o.value) === String(current));
    const next = options[(i + dir + options.length) % options.length];
    select(next.value, true);
    buttons[options.indexOf(next)].focus();
  });
  group.append(...buttons);
  paint();
  if (!label || hideLabel) group.classList.add(...cls.split(' ').filter(Boolean));
  const el = label && !hideLabel ? h('div', { class: `field ${cls}`.trim() }, h('span', { class: 'field-label' }, label), group) : group;
  return { el, get: () => current, set: (v) => select(v, false) };
}

/** Schalter mit Beschriftung. */
export function switchField({ label, checked = false, onChange, hint, class: cls = '' }) {
  const input = h('input', { type: 'checkbox', role: 'switch', checked, class: 'switch-input' });
  input.addEventListener('change', () => onChange?.(input.checked));
  const el = h(
    'label',
    { class: `switch ${cls}`.trim() },
    input,
    h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-thumb' })),
    h('span', { class: 'switch-text' }, h('span', { class: 'switch-label' }, label), hint ? h('span', { class: 'field-hint' }, hint) : null),
  );
  return { el, input, get: () => input.checked, set: (v) => (input.checked = v) };
}

/** Schieberegler mit Wertanzeige. */
export function slider({ label, min, max, step = 1, value, format = String, onInput, class: cls = '' }) {
  const input = h('input', { type: 'range', class: 'range', min, max, step, value });
  const out = h('output', { class: 'range-value' }, format(value));
  const paint = () => {
    const pct = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
    out.textContent = format(Number(input.value));
  };
  input.addEventListener('input', () => {
    paint();
    onInput?.(Number(input.value));
  });
  paint();
  input.id = uid('f');
  const el = h('div', { class: `field ${cls}`.trim() }, h('div', { class: 'field-row' }, h('label', { class: 'field-label', for: input.id }, label), out), input);
  return { el, input, get: () => Number(input.value), set: (v) => ((input.value = String(v)), paint()) };
}

/** Mehrzeiliger Listeneditor (ein Eintrag pro Zeile) mit Zähler. */
export function listEditor({ label, value = '', placeholder, rows = 7, maxItems = 500, onChange, hint }) {
  const area = h('textarea', { class: 'input textarea', rows, placeholder, value, spellcheck: false, autocomplete: 'off', maxLength: maxItems * 81 });
  const count = h('span', { class: 'field-count' });
  const items = () => parseList(area.value, { maxItems });
  const paint = () => (count.textContent = t('common.entries', { n: items().length }));
  area.addEventListener('input', () => {
    paint();
    onChange?.(area.value);
  });
  area.id = uid('f');
  paint();
  const el = h(
    'div',
    { class: 'field' },
    h('div', { class: 'field-row' }, h('label', { class: 'field-label', for: area.id }, label), count),
    area,
    hint ? h('p', { class: 'field-hint' }, hint) : null,
  );
  return {
    el,
    area,
    items,
    set(text) {
      area.value = text;
      paint();
      onChange?.(text);
    },
  };
}

// ---------------------------------------------------------------- Ergebnisse

/** Kopier-Button, der zum Klickzeitpunkt `getText()` abfragt. */
export function copyButton(getText, { label = t('common.copy'), variant = 'ghost', size = 'sm' } = {}) {
  return button({
    label,
    icon: 'copy',
    variant,
    size,
    onClick: () => {
      const text = getText();
      if (text) copyText(text);
    },
  });
}

/** Verlauf der letzten Ergebnisse (nur im Speicher, nicht persistent). */
export function createHistory({ max = 12 } = {}) {
  const list = h('ol', { class: 'history-list', 'aria-label': t('common.history') });
  const clearBtn = button({ label: t('common.clear'), variant: 'ghost', size: 'sm', onClick: () => clear() });
  const el = h('section', { class: 'history', hidden: true }, h('div', { class: 'history-head' }, h('h3', { class: 'history-title' }, t('common.history')), clearBtn), list);
  function clear() {
    list.replaceChildren();
    el.hidden = true;
  }
  return {
    el,
    clear,
    add(text) {
      el.hidden = false;
      list.prepend(h('li', { class: 'history-item' }, text));
      while (list.children.length > max) list.lastChild.remove();
    },
  };
}

/** Karte mit optionaler Überschrift. */
export function panel(title, ...children) {
  return h('section', { class: 'panel' }, title ? h('h2', { class: 'panel-title' }, title) : null, ...children);
}

/** Für Screenreader reservierter Ergebnisbereich, der erst nach der Animation befüllt wird. */
export function liveRegion() {
  return h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
}
