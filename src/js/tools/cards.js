import { h } from '../dom.js';
import { shuffle } from '../lib/random.js';
import { dur, play, settle } from '../motion.js';
import { button, createHistory, liveRegion, panel, segmented, stepper, whileBusy } from '../ui.js';

const SUITS = [
  { sym: '♠', red: false },
  { sym: '♥', red: true },
  { sym: '♦', red: true },
  { sym: '♣', red: false },
];
const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_32 = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function buildDeck(kind) {
  const ranks = kind === 'skat32' ? RANKS_32 : RANKS_52;
  const deck = SUITS.flatMap((suit) => ranks.map((rank) => ({ rank, ...suit })));
  if (kind === 'french54') deck.push({ rank: '★', sym: '', red: false, joker: true }, { rank: '★', sym: '', red: true, joker: true });
  return deck;
}

const label = (card) => (card.joker ? '★' : `${card.sym}${card.rank}`);

function cardEl(card) {
  const tone = card.red ? 'is-red' : '';
  const front = h(
    'div',
    { class: `card-face card-front ${tone}` },
    h('span', { class: 'card-corner' }, h('b', {}, card.rank), card.sym ? h('i', {}, card.sym) : null),
    h('span', { class: 'card-pip' }, card.joker ? 'JOKER' : card.sym),
    h('span', { class: 'card-corner is-bottom' }, h('b', {}, card.rank), card.sym ? h('i', {}, card.sym) : null),
  );
  const inner = h('div', { class: 'card-inner' }, front, h('div', { class: 'card-face card-back' }));
  inner.style.transform = 'rotateY(180deg)';
  return { el: h('div', { class: 'play-card', role: 'img', 'aria-label': card.joker ? 'Joker' : `${card.rank} ${card.sym}` }, inner), inner };
}

export default {
  id: 'cards',
  category: 'groups',
  icon: 'cards',
  messages: {
    de: {
      title: 'Karten ziehen',
      desc: 'Zieh Karten aus einem gemischten Skat- oder Pokerblatt.',
      keywords: 'karten spielkarten poker skat blatt ziehen mischen joker',
      draw: 'Karte ziehen',
      reshuffle: 'Neu mischen',
      deck: 'Kartenblatt',
      french52: '52 Karten',
      skat32: '32 Karten (Skat)',
      french54: '54 mit Joker',
      count: 'Karten pro Zug',
      left: 'Noch {n} im Stapel',
      empty: 'Der Stapel ist leer. Mische neu.',
      notEnough: 'Nur noch {n} im Stapel. Mische neu oder ziehe weniger.',
      idle: 'Der Stapel ist gemischt.',
    },
    en: {
      title: 'Draw cards',
      desc: 'Draw cards from a shuffled poker or skat deck.',
      keywords: 'cards playing poker skat deck draw shuffle joker',
      draw: 'Draw card',
      reshuffle: 'Reshuffle',
      deck: 'Deck',
      french52: '52 cards',
      skat32: '32 cards (Skat)',
      french54: '54 with jokers',
      count: 'Cards per draw',
      left: '{n} left in the deck',
      empty: 'The deck is empty. Reshuffle.',
      notEnough: 'Only {n} left in the deck. Reshuffle or draw fewer.',
      idle: 'The deck is shuffled.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    let deck = [];
    const table = h('div', { class: 'card-table' });
    const note = h('p', { class: 'stage-note' });
    const live = liveRegion();
    const history = createHistory();

    const kind = segmented({
      label: t('deck'),
      options: ['french52', 'skat32', 'french54'].map((value) => ({ value, label: t(value) })),
      value: ctx.load('kind', 'french52'),
      onChange: (v) => (ctx.save('kind', v), reshuffle()),
    });
    const count = stepper({ label: t('count'), value: 1, min: 1, max: 10 });

    function reshuffle() {
      deck = shuffle(buildDeck(kind.get()));
      table.replaceChildren();
      note.classList.remove('is-error');
      note.textContent = `${t('idle')} ${t('left', { n: deck.length })}`;
    }

    const go = button({
      label: t('draw'),
      icon: 'cards',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          const n = count.get();
          note.classList.remove('is-error');
          if (deck.length < n) {
            note.textContent = deck.length === 0 ? t('empty') : t('notEnough', { n: deck.length });
            note.classList.add('is-error');
            return;
          }
          const drawn = deck.splice(0, n);
          table.replaceChildren();
          const els = drawn.map(cardEl);
          els.forEach(({ el }) => table.append(el));
          await Promise.all(
            els.map(({ inner }, i) =>
              play(inner, [{ transform: 'rotateY(180deg) translateY(0)' }, { transform: 'rotateY(90deg) translateY(-14px)', offset: 0.5 }, { transform: 'rotateY(0deg) translateY(0)' }], { duration: dur(650), delay: dur(i * 150), easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }).then(() => settle(inner, { transform: 'rotateY(0deg)' })),
            ),
          );
          note.textContent = t('left', { n: deck.length });
          live.textContent = drawn.map(label).join(', ');
          history.add(drawn.map(label).join(' '));
        }),
    });
    const shuffleBtn = button({ label: t('reshuffle'), icon: 'shuffle', variant: 'secondary', onClick: () => (reshuffle(), history.clear()) });

    reshuffle();
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, table, note, live), h('div', { class: 'stage-actions' }, go, shuffleBtn)), history.el),
      h('div', { class: 'controls-col' }, panel(null, kind.el, count.el)),
    );
  },
};
