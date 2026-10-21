import { h } from '../dom.js';
import { splitIntoTeams } from '../lib/random.js';
import { sleep } from '../motion.js';
import { button, copyButton, listEditor, liveRegion, panel, segmented, stepper, whileBusy } from '../ui.js';

const DEFAULT_NAMES = ['Anna', 'Ben', 'Chiara', 'David', 'Emma', 'Felix', 'Greta', 'Hannes'].join('\n');

export default {
  id: 'teams',
  category: 'groups',
  icon: 'teams',
  messages: {
    de: {
      title: 'Teams auslosen',
      desc: 'Verteilt Namen fair auf Gruppen.',
      keywords: 'gruppen mannschaften aufteilen verteilen einteilen team wahl',
      go: 'Teams auslosen',
      by: 'Aufteilen nach',
      byTeams: 'Anzahl Teams',
      bySize: 'Teamgröße',
      teams: 'Anzahl der Teams',
      size: 'Personen pro Team',
      team: 'Team {n}',
      idle: 'Trage Namen ein und lose die Teams aus.',
      errTeams: 'Mehr Teams als Personen geht nicht.',
      people: { one: '{n} Person', other: '{n} Personen' },
    },
    en: {
      title: 'Team picker',
      desc: 'Splits names into fair groups.',
      keywords: 'groups squads split divide assign team',
      go: 'Draw teams',
      by: 'Split by',
      byTeams: 'Number of teams',
      bySize: 'Team size',
      teams: 'Number of teams',
      size: 'People per team',
      team: 'Team {n}',
      idle: 'Enter names and draw the teams.',
      errTeams: 'There cannot be more teams than people.',
      people: { one: '{n} person', other: '{n} people' },
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const grid = h('div', { class: 'team-grid' });
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    let last = '';

    const editor = listEditor({ label: t('itemsLabel'), value: ctx.load('items', DEFAULT_NAMES), placeholder: 'Anna\nBen\nChiara', rows: 9, maxItems: 200, onChange: (v) => ctx.save('items', v) });
    const mode = segmented({
      label: t('by'),
      options: [
        { value: 'teams', label: t('byTeams') },
        { value: 'size', label: t('bySize') },
      ],
      value: ctx.load('mode', 'teams'),
      onChange: (v) => (ctx.save('mode', v), sync()),
    });
    const amount = stepper({ label: t('teams'), value: ctx.load('amount', 2), min: 2, max: 50, onChange: (v) => v !== null && ctx.save('amount', v) });
    function sync() {
      amount.el.querySelector('.field-label').textContent = mode.get() === 'teams' ? t('teams') : t('size');
    }

    const go = button({
      label: t('go'),
      icon: 'teams',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const names = editor.items();
          note.classList.remove('is-error');
          if (names.length < 2) {
            note.textContent = ctx.t('needItems', { n: 2 });
            note.classList.add('is-error');
            return;
          }
          const teamCount = mode.get() === 'teams' ? amount.get() : Math.ceil(names.length / amount.get());
          if (teamCount > names.length || teamCount < 1) {
            note.textContent = t('errTeams');
            note.classList.add('is-error');
            return;
          }
          const teams = splitIntoTeams(names, teamCount);
          note.textContent = '';
          grid.replaceChildren();
          for (const [i, members] of teams.entries()) {
            const card = h(
              'section',
              { class: 'team-card' },
              h('h3', { class: 'team-title' }, t('team', { n: i + 1 }), h('span', { class: 'team-size' }, t('people', { n: members.length }))),
              h('ul', { class: 'team-members' }, members.map((m) => h('li', { title: m }, m))),
            );
            grid.append(card);
            await sleep(110);
          }
          last = teams.map((m, i) => `${t('team', { n: i + 1 })}: ${m.join(', ')}`).join('\n');
          live.textContent = last;
        }),
    });

    sync();
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage is-top' }, h('div', { class: 'stage-display is-stretch' }, grid, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => last)))),
      h('div', { class: 'controls-col' }, panel(null, editor.el, mode.el, amount.el)),
    );
  },
};
