import { load, save } from './storage.js';

export const THEMES = ['auto', 'light', 'dark'];

export function getTheme() {
  const saved = load('theme', 'auto');
  return THEMES.includes(saved) ? saved : 'auto';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
  save('theme', next);
  applyTheme(next);
  return next;
}
