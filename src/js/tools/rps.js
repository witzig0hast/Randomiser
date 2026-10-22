import { h, s } from '../dom.js';
import { pick } from '../lib/random.js';
import { dur, play, settle } from '../motion.js';
import { button, createHistory, liveRegion, whileBusy } from '../ui.js';

const HANDS = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

function art(kind, size = 64) {
  const svg = s('svg', { viewBox: '0 0 64 64', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'hand-art' });
  const paths = {
    rock: ['M10 38c0-13 10-24 24-24 12 0 20 8 20 20 0 12-9 20-21 20H22c-7 0-12-6-12-16z', 'M22 32c2-6 7-10 13-11', 'M40 46c3 0 6-1 8-4'],
    paper: ['M17 9h24l10 10v36a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z', 'M41 9v11h10M23 30h20M23 38h20M23 46h13'],
    scissors: ['M14 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M14 40a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M19 20L55 52M19 44L55 12'],
  };
  paths[kind].forEach((d) => svg.append(s('path', { d })));
  return svg;
}

export default {
  id: 'rps',
  category: 'decide',
  icon: 'rps',
  messages: {
    de: {
      title: 'Schere, Stein, Papier',
      desc: 'Tritt gegen den Zufall an.',
      keywords: 'spiel duell hand schnick schnack schnuck',
      rock: 'Stein',
      paper: 'Papier',
      scissors: 'Schere',
      you: 'Du',
      cpu: 'Zufall',
      win: 'Gewonnen',
      lose: 'Verloren',
      draw: 'Unentschieden',
      random: 'Für mich wählen',
      idle: 'Wähle deine Hand.',
      ready: 'Schere, Stein, Papier …',
      score: 'Siege {w} · Niederlagen {l} · Remis {d}',
      choose: 'Hand wählen',
    },
    en: {
      title: 'Rock paper scissors',
      desc: 'Play against chance.',
      keywords: 'game duel hand',
      rock: 'Rock',
      paper: 'Paper',
      scissors: 'Scissors',
      you: 'You',
      cpu: 'Chance',
      win: 'You win',
      lose: 'You lose',
      draw: 'Draw',
      random: 'Choose for me',
      idle: 'Pick your hand.',
      ready: 'Rock, paper, scissors …',
      score: 'Wins {w} · Losses {l} · Draws {d}',
      choose: 'Pick a hand',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const score = { w: 0, l: 0, d: 0 };

    const youHand = h('div', { class: 'rps-hand' }, art('rock', 72));
    const cpuHand = h('div', { class: 'rps-hand' }, art('rock', 72));
    cpuHand.firstElementChild.classList.add('is-mirrored');
    const outcome = h('p', { class: 'rps-outcome' }, ' ');
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory({ max: 10 });
    const scoreEl = h('p', { class: 'stage-note' }, t('score', score));

    const show = (el, kind, mirrored) => {
      const svg = art(kind, 72);
      if (mirrored) svg.classList.add('is-mirrored');
      el.replaceChildren(svg);
    };

    const buttons = [];
    async function play_(mine) {
      const theirs = pick(HANDS);
      outcome.textContent = ' ';
      outcome.className = 'rps-outcome';
      note.textContent = t('ready');
      show(youHand, 'rock');
      show(cpuHand, 'rock', true);
      const shake = (el, dir) => play(el, [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-18px) rotate(${dir * 8}deg)` }, { transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-18px) rotate(${dir * -8}deg)` }, { transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-18px) rotate(${dir * 8}deg)` }, { transform: 'translateY(0) rotate(0)' }], { duration: dur(1100), easing: 'ease-in-out' });
      await Promise.all([shake(youHand, 1), shake(cpuHand, -1)]);
      settle(youHand);
      settle(cpuHand);
      show(youHand, mine);
      show(cpuHand, theirs, true);
      await Promise.all([play(youHand, [{ transform: 'scale(0.7)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }), play(cpuHand, [{ transform: 'scale(0.7)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })]);
      const result = mine === theirs ? 'draw' : BEATS[mine] === theirs ? 'win' : 'lose';
      score[{ win: 'w', lose: 'l', draw: 'd' }[result]]++;
      outcome.textContent = t(result);
      outcome.className = `rps-outcome is-${result}`;
      note.textContent = '';
      scoreEl.textContent = t('score', score);
      live.textContent = `${t(mine)} – ${t(theirs)}: ${t(result)}`;
      history.add(`${t(mine)} : ${t(theirs)} · ${t(result)}`);
    }

    const run = (mine) => whileBusy(buttons, () => play_(mine));

    const choices = h(
      'div',
      { class: 'rps-choices', role: 'group', 'aria-label': t('choose') },
      HANDS.map((kind) => {
        const b = h('button', { type: 'button', class: 'rps-choice', onClick: () => run(kind) }, art(kind, 36), h('span', {}, t(kind)));
        buttons.push(b);
        return b;
      }),
    );
    const randomBtn = button({ label: t('random'), icon: 'shuffle', variant: 'ghost', size: 'sm', onClick: () => run(pick(HANDS)) });
    randomBtn.dataset.shortcut = ''; // Leertaste spielt eine zufällige Hand
    buttons.push(randomBtn);

    root.classList.add('is-single');
    root.append(
      h(
        'div',
        { class: 'stage-col' },
        h(
          'section',
          { class: 'stage' },
          h('div', { class: 'stage-display' }, h('div', { class: 'rps-arena' }, h('div', { class: 'rps-side' }, youHand, h('span', { class: 'rps-name' }, t('you'))), h('span', { class: 'rps-vs', 'aria-hidden': 'true' }, 'VS'), h('div', { class: 'rps-side' }, cpuHand, h('span', { class: 'rps-name' }, t('cpu')))), outcome, note, scoreEl, live),
          h('div', { class: 'stage-actions' }, choices, randomBtn),
        ),
        history.el,
      ),
    );
  },
};
