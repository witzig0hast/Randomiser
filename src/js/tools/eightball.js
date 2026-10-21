import { h } from '../dom.js';
import { pick } from '../lib/random.js';
import { dur, play } from '../motion.js';
import { button, createHistory, liveRegion, whileBusy } from '../ui.js';

const ANSWERS = {
  de: {
    yes: ['Es ist sicher.', 'Ganz klar so.', 'Ohne Zweifel.', 'Ja, definitiv.', 'Darauf kannst du dich verlassen.', 'Soweit ich sehe: ja.', 'Höchstwahrscheinlich.', 'Die Aussichten sind gut.', 'Ja.', 'Alle Zeichen stehen auf Ja.'],
    maybe: ['Unklar, frag später noch einmal.', 'Frag später noch einmal.', 'Das sage ich dir jetzt besser nicht.', 'Das lässt sich jetzt nicht sagen.', 'Konzentrier dich und frag erneut.'],
    no: ['Verlass dich nicht darauf.', 'Meine Antwort ist nein.', 'Meine Quellen sagen nein.', 'Die Aussichten sind nicht so gut.', 'Sehr zweifelhaft.'],
  },
  en: {
    yes: ['It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.'],
    maybe: ['Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.'],
    no: ['Don’t count on it.', 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'],
  },
};

export default {
  id: 'eightball',
  category: 'decide',
  icon: 'ball',
  messages: {
    de: { title: 'Magic 8-Ball', desc: 'Stell eine Frage und schüttle die Kugel.', keywords: 'orakel schicksal frage kugel', shake: 'Schütteln', idle: 'Konzentriere dich auf eine Ja/Nein-Frage und schüttle die Kugel.' },
    en: { title: 'Magic 8-Ball', desc: 'Ask a question and shake the ball.', keywords: 'oracle fortune question ball', shake: 'Shake', idle: 'Think of a yes/no question and shake the ball.' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const answers = ANSWERS[ctx.lang] ?? ANSWERS.en;
    const pool = Object.entries(answers).flatMap(([tone, list]) => list.map((text) => ({ tone, text })));

    const label = h('span', { class: 'ball-label' }, '8');
    const windowEl = h('div', { class: 'ball-window' }, label);
    const ball = h('div', { class: 'ball-wrap' }, h('div', { class: 'ball' }), windowEl);
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory({ max: 8 });

    const shake = button({
      label: t('shake'),
      icon: 'ball',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(shake, async () => {
          // Klassische Verteilung: 10 zustimmende, 5 unklare, 5 ablehnende Antworten, jede gleich wahrscheinlich
          const { tone, text } = pick(pool);
          note.textContent = '';
          await play(label, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 });
          const wobble = (x, y, r) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` });
          await play(ball, [wobble(0, 0, 0), wobble(-16, -8, -9), wobble(15, 6, 8), wobble(-14, 8, -7), wobble(13, -7, 6), wobble(-9, 4, -4), wobble(6, -3, 2), wobble(0, 0, 0)], { duration: dur(1100), easing: 'ease-in-out' });
          label.textContent = text;
          label.className = `ball-label is-answer is-${tone}`;
          await play(label, [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' });
          live.textContent = text;
          history.add(text);
        }),
    });
    ball.addEventListener('click', () => !shake.disabled && shake.click());

    root.classList.add('is-single');
    root.append(h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, ball, note, live), h('div', { class: 'stage-actions' }, shake)), history.el));
  },
};
