import { h, mount } from './dom.js';
import { icon } from './icons.js';
import { LANGUAGES, detectLanguage, getLanguage, has, onLanguageChange, register, setLanguage, t } from './i18n.js';
import { applyTheme, cycleTheme, getTheme } from './theme.js';
import { load, save } from './storage.js';
import { iconButton, segmented } from './ui.js';
import de from './locales/de.js';
import en from './locales/en.js';
import { CATEGORIES, TOOLS, toolById } from './tools/index.js';

register('de', '', de);
register('en', '', en);
setLanguage(detectLanguage(), { persist: false });
applyTheme(getTheme());

const THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };

/** Übersetzer, der erst im Namensraum des Werkzeugs und dann global sucht. */
const scopedT = (id) => (key, params) => {
  if (has(`${id}.${key}`)) return t(`${id}.${key}`, params);
  return has(`common.${key}`) ? t(`common.${key}`, params) : t(key, params);
};

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let cleanups = [];
let query = '';
let category = 'all';

function runCleanups() {
  cleanups.forEach((fn) => {
    try {
      fn();
    } catch {
      /* Aufräumen darf nie die Navigation blockieren */
    }
  });
  cleanups = [];
}

// ---------------------------------------------------------------- Rahmen

function renderHeader() {
  const themeBtn = iconButton({
    label: t(`app.theme.${getTheme()}`),
    icon: THEME_ICON[getTheme()],
    class: 'theme-toggle',
    onClick: () => {
      cycleTheme();
      const mode = getTheme();
      themeBtn.title = t(`app.theme.${mode}`);
      themeBtn.setAttribute('aria-label', t(`app.theme.${mode}`));
      themeBtn.replaceChildren(icon(THEME_ICON[mode], { size: 18 }));
    },
  });
  const lang = segmented({
    label: t('app.language'),
    options: LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
    value: getLanguage(),
    onChange: (code) => setLanguage(code),
    class: 'lang-switch',
    hideLabel: true,
  });
  return h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'container header-inner' },
      h('a', { class: 'brand', href: '#/', 'aria-label': `${t('app.name')} – ${t('app.home')}` }, h('span', { class: 'brand-mark' }, icon('logo', { size: 20, strokeWidth: 1.8 })), h('span', { class: 'brand-name' }, t('app.name'))),
      h('div', { class: 'header-actions' }, lang.el, themeBtn),
    ),
  );
}

function renderFooter() {
  return h('footer', { class: 'site-footer' }, h('div', { class: 'container footer-inner' }, icon('shield', { size: 18 }), h('p', {}, t('app.footer'))));
}

// ---------------------------------------------------------------- Seiten

function toolCard(tool) {
  return h(
    'a',
    { class: 'tool-card', href: `#/${tool.id}` },
    h('span', { class: 'tool-card-icon' }, icon(tool.icon, { size: 22 })),
    h('span', { class: 'tool-card-body' }, h('span', { class: 'tool-card-title' }, scopedT(tool.id)('title')), h('span', { class: 'tool-card-desc' }, scopedT(tool.id)('desc'))),
  );
}

function matches(tool) {
  if (category !== 'all' && tool.category !== category) return false;
  const q = normalize(query.trim());
  if (!q) return true;
  const tt = scopedT(tool.id);
  const haystack = normalize([tt('title'), tt('desc'), has(`${tool.id}.keywords`) ? tt('keywords') : ''].join(' '));
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function renderHome() {
  const results = h('div', { class: 'catalog' });
  const paint = () => {
    const sections = CATEGORIES.map((cat) => {
      const tools = TOOLS.filter((tool) => tool.category === cat && matches(tool));
      if (!tools.length) return null;
      return h(
        'section',
        { class: 'category', 'aria-labelledby': `cat-${cat}` },
        h('h2', { class: 'category-title', id: `cat-${cat}` }, t(`app.categories.${cat}`)),
        h('div', { class: 'tool-grid' }, tools.map(toolCard)),
      );
    }).filter(Boolean);
    mount(results, sections.length ? sections : h('p', { class: 'empty' }, t('app.noResults')));
  };

  const search = h('input', {
    class: 'search-input',
    type: 'search',
    value: query,
    placeholder: t('app.searchPlaceholder'),
    'aria-label': t('app.search'),
    autocomplete: 'off',
    spellcheck: false,
    maxLength: 60,
    onInput: (e) => {
      query = e.target.value;
      paint();
    },
  });

  const chips = ['all', ...CATEGORIES].map((cat) =>
    h(
      'button',
      {
        type: 'button',
        class: `chip${cat === category ? ' is-active' : ''}`,
        'aria-pressed': String(cat === category),
        onClick: (e) => {
          category = cat;
          chips.forEach((c) => {
            const active = c === e.currentTarget;
            c.classList.toggle('is-active', active);
            c.setAttribute('aria-pressed', String(active));
          });
          paint();
        },
      },
      cat === 'all' ? t('app.all') : t(`app.categories.${cat}`),
    ),
  );

  const onKey = (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName ?? '');
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      search.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));

  paint();
  document.title = `${t('app.name')} – ${t('app.heroTitle')}`;

  return h(
    'div',
    { class: 'home' },
    h('section', { class: 'hero' }, h('h1', { class: 'hero-title', tabIndex: -1 }, t('app.heroTitle')), h('p', { class: 'hero-text' }, t('app.heroText', { n: TOOLS.length }))),
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', { size: 18 }), search, h('kbd', { class: 'kbd', 'aria-hidden': 'true' }, '/')), h('div', { class: 'chips', role: 'group', 'aria-label': t('app.filter') }, chips)),
    results,
  );
}

function renderTool(tool) {
  const tt = scopedT(tool.id);
  const stage = h('div', { class: 'tool-body' });
  const page = h(
    'article',
    { class: 'tool-page' },
    h('a', { class: 'back-link', href: '#/' }, icon('back', { size: 16 }), t('app.back')),
    h(
      'header',
      { class: 'tool-header' },
      h('span', { class: 'tool-header-icon' }, icon(tool.icon, { size: 26 })),
      h('div', {}, h('h1', { class: 'tool-title', tabIndex: -1 }, tt('title')), h('p', { class: 'tool-desc' }, tt('desc'))),
    ),
    stage,
  );
  const ctx = {
    id: tool.id,
    t: tt,
    lang: getLanguage(),
    onCleanup: (fn) => cleanups.push(fn),
    load: (key, fallback) => load(`${tool.id}.${key}`, fallback),
    save: (key, value) => save(`${tool.id}.${key}`, value),
  };
  try {
    tool.mount(stage, ctx);
  } catch (error) {
    console.error(error);
    mount(stage, h('p', { class: 'empty' }, t('app.loadError')));
  }

  // Leertaste löst die Hauptaktion aus, solange der Fokus nicht in einem Bedienelement liegt.
  const shortcut = stage.querySelector('.stage [data-shortcut]') ?? stage.querySelector('.stage .btn-primary');
  if (shortcut) {
    shortcut.setAttribute('aria-keyshortcuts', 'Space');
    const onKey = (e) => {
      if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, button, a, [contenteditable], [role="radio"]')) return;
      e.preventDefault();
      if (!shortcut.disabled) shortcut.click();
    };
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));
  }
  document.title = `${tt('title')} – ${t('app.name')}`;
  return page;
}

function renderNotFound() {
  document.title = `${t('app.name')}`;
  return h('div', { class: 'home' }, h('p', { class: 'empty' }, t('app.notFound')), h('a', { class: 'back-link', href: '#/' }, icon('back', { size: 16 }), t('app.back')));
}

// ---------------------------------------------------------------- Routing

const app = document.getElementById('app');
let view;
let lastRoute = null;

function currentRoute() {
  const id = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  if (!id) return { id: '' };
  return { id, tool: toolById(id) };
}

function renderRoute({ resetScroll }) {
  runCleanups();
  const route = currentRoute();
  const page = !route.id ? renderHome() : route.tool ? renderTool(route.tool) : renderNotFound();
  mount(view, page);
  if (resetScroll) {
    window.scrollTo(0, 0);
    view.querySelector('h1')?.focus({ preventScroll: true });
  }
  lastRoute = route.id;
}

function renderShell() {
  view = h('main', { id: 'main', class: 'container main', tabIndex: -1 });
  mount(app, h('a', { class: 'skip-link', href: '#main', onClick: (e) => (e.preventDefault(), view.focus()) }, t('app.skip')), renderHeader(), view, renderFooter());
}

renderShell();
renderRoute({ resetScroll: false });

window.addEventListener('hashchange', () => renderRoute({ resetScroll: currentRoute().id !== lastRoute }));
onLanguageChange(() => {
  renderShell();
  renderRoute({ resetScroll: false });
});
