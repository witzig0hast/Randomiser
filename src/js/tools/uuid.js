import { h } from '../dom.js';
import { uuidV4 } from '../lib/random.js';
import { button, copyButton, copyText, iconButton, liveRegion, panel, stepper, switchField } from '../ui.js';

export default {
  id: 'uuid',
  category: 'text',
  icon: 'uuid',
  messages: {
    de: {
      title: 'UUID-Generator',
      desc: 'Zufällige UUIDs (Version 4) für Entwicklung und Tests.',
      keywords: 'uuid guid kennung id entwickler eindeutig',
      go: 'Neu erzeugen',
      count: 'Anzahl',
      upper: 'Großbuchstaben',
      hyphens: 'Mit Bindestrichen',
      copyOne: 'UUID kopieren',
      copyAll: 'Alle kopieren',
    },
    en: {
      title: 'UUID generator',
      desc: 'Random UUIDs (version 4) for development and testing.',
      keywords: 'uuid guid identifier id developer unique',
      go: 'Generate new',
      count: 'Count',
      upper: 'Uppercase',
      hyphens: 'With hyphens',
      copyOne: 'Copy UUID',
      copyAll: 'Copy all',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const list = h('ul', { class: 'uuid-list' });
    const live = liveRegion();
    let values = [];

    const count = stepper({ label: t('count'), value: ctx.load('count', 5), min: 1, max: 50, onChange: (v) => v !== null && ctx.save('count', v) });
    const upper = switchField({ label: t('upper'), checked: ctx.load('upper', false), onChange: (v) => (ctx.save('upper', v), render()) });
    const hyphens = switchField({ label: t('hyphens'), checked: ctx.load('hyphens', true), onChange: (v) => (ctx.save('hyphens', v), render()) });

    const fmt = (id) => {
      const v = hyphens.get() ? id : id.replaceAll('-', '');
      return upper.get() ? v.toUpperCase() : v;
    };

    function render() {
      list.replaceChildren(
        ...values.map((id, i) => {
          const text = fmt(id);
          const row = h('li', { class: 'uuid-row' }, h('code', { class: 'uuid-value' }, text), iconButton({ label: t('copyOne'), icon: 'copy', onClick: () => copyText(text) }));
          row.style.animationDelay = `${Math.min(i, 12) * 30}ms`;
          return row;
        }),
      );
    }

    function generate() {
      values = Array.from({ length: count.get() }, uuidV4);
      render();
      live.textContent = `${values.length} UUID`;
    }

    const go = button({ label: t('go'), icon: 'refresh', variant: 'primary', size: 'lg', onClick: generate });
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage is-top' }, h('div', { class: 'stage-display is-stretch' }, list, live), h('div', { class: 'stage-actions' }, go, copyButton(() => values.map(fmt).join('\n'), { label: t('copyAll'), variant: 'secondary', size: undefined })))),
      h('div', { class: 'controls-col' }, panel(null, count.el, upper.el, hyphens.el)),
    );
    generate();
  },
};
