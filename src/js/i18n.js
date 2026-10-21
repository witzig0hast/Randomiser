import { load, save } from './storage.js';

export const LANGUAGES = [
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'en', label: 'EN', name: 'English' },
];
const FALLBACK = 'en';

const dictionaries = Object.fromEntries(LANGUAGES.map(({ code }) => [code, new Map()]));
const events = new EventTarget();
let current = FALLBACK;

function isPlural(value) {
  return value && typeof value === 'object' && 'other' in value;
}

function flatten(prefix, value, out) {
  if (value && typeof value === 'object' && !isPlural(value) && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(prefix ? `${prefix}.${k}` : k, v, out);
  } else out.set(prefix, value);
}

/** Meldet Texte für eine Sprache an. `namespace` ist z. B. der Werkzeug-Id. */
export function register(lang, namespace, messages) {
  const map = new Map();
  flatten(namespace, messages, map);
  for (const [k, v] of map) dictionaries[lang].set(k, v);
}

export function detectLanguage() {
  const saved = load('lang', null);
  if (LANGUAGES.some((l) => l.code === saved)) return saved;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (LANGUAGES.some((l) => l.code === code)) return code;
  }
  return FALLBACK;
}

export function getLanguage() {
  return current;
}

export function setLanguage(code, { persist = true } = {}) {
  if (!LANGUAGES.some((l) => l.code === code)) return;
  current = code;
  document.documentElement.lang = code;
  if (persist) save('lang', code);
  events.dispatchEvent(new Event('change'));
}

export function onLanguageChange(handler) {
  events.addEventListener('change', handler);
  return () => events.removeEventListener('change', handler);
}

function lookup(key) {
  return dictionaries[current].get(key) ?? dictionaries[FALLBACK].get(key);
}

/** Existiert der Schlüssel in der aktuellen oder der Fallback-Sprache? */
export function has(key) {
  return lookup(key) !== undefined;
}

/** Übersetzt `key`; `{name}` wird durch `params.name` ersetzt, Plural-Objekte über `params.n`. */
export function t(key, params = {}) {
  let value = lookup(key);
  if (value === undefined) return key;
  if (isPlural(value)) {
    const rule = new Intl.PluralRules(current).select(params.n ?? 0);
    value = value[rule] ?? value.other;
  }
  return String(value).replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
}

/** Zahl landesüblich formatieren. */
export function formatNumber(value, options) {
  return new Intl.NumberFormat(current, options).format(value);
}
