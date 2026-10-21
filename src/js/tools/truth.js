import { h } from '../dom.js';
import { chance, shuffle } from '../lib/random.js';
import { dur, play, settle } from '../motion.js';
import { button, createHistory, liveRegion, whileBusy } from '../ui.js';

const CONTENT = {
  de: {
    truth: [
      'Was war dein peinlichster Moment in der Schule?',
      'Welche Angewohnheit von dir nervt andere am meisten?',
      'Welches Talent hättest du gern, das du nicht hast?',
      'Was war die schlechteste Idee, die du je umgesetzt hast?',
      'Welchen Song hörst du heimlich, obwohl er dir peinlich ist?',
      'Was würdest du tun, wenn du einen Tag unsichtbar wärst?',
      'Wann hast du zuletzt gelogen und worüber?',
      'Was war dein größter Kindheitstraum?',
      'Welche Serie hast du am häufigsten geschaut?',
      'Worüber hast du zuletzt so gelacht, dass dir die Tränen kamen?',
      'Welche Superkraft würdest du wählen und warum?',
      'Was ist das Seltsamste, das du je gegessen hast?',
      'Wen aus dieser Runde würdest du auf eine einsame Insel mitnehmen?',
      'Was ist dein größter Aberglaube?',
      'Welche App nutzt du am meisten und wie viele Stunden pro Woche?',
      'Was war dein schlechtester Haarschnitt?',
      'Welches Wort sprichst du beharrlich falsch aus?',
      'Was wolltest du schon immer mal tun, hast dich aber nie getraut?',
      'Welche Eigenschaft schätzt du an dir selbst am meisten?',
      'Wofür gibst du zu viel Geld aus?',
    ],
    dare: [
      'Sprich eine Minute lang mit einem Akzent deiner Wahl.',
      'Imitiere ein Tier, bis jemand es errät.',
      'Tanze 30 Sekunden lang ohne Musik.',
      'Sing den Refrain eines Liedes, das die Runde auswählt.',
      'Erzähle einen Witz. Die Runde bewertet ihn von 1 bis 10.',
      'Geh in deine beste Model-Pose und halte sie 10 Sekunden.',
      'Sprich die nächsten drei Minuten nur in Fragen.',
      'Verrate deinen heimlichen Lieblingssnack und verteidige ihn.',
      'Laufe eine Runde wie ein Pinguin durch den Raum.',
      'Erfinde ein neues Wort und erkläre, was es bedeutet.',
      'Mache zehn Kniebeugen und sage dabei das Alphabet auf.',
      'Halte eine dramatische Rede über deinen Lieblingsfilm.',
      'Lies die Rückseite einer Verpackung wie ein Nachrichtensprecher vor.',
      'Gib der Person links von dir ein ehrliches Kompliment.',
      'Erzähle eine Geschichte, in der jeder Satz mit dem letzten Buchstaben des vorigen beginnt.',
      'Sage dreimal mit Roboterstimme: „Ich bin ein Roboter.“',
      'Male in 30 Sekunden ein Porträt von jemandem aus der Runde.',
      'Stelle ein bekanntes Filmzitat pantomimisch dar.',
      'Sprich die nächste Runde nur im Flüsterton.',
      'Zieh deine lustigste Grimasse und halte sie 10 Sekunden.',
    ],
  },
  en: {
    truth: [
      'What was your most embarrassing moment at school?',
      'Which habit of yours annoys others the most?',
      'Which talent do you wish you had?',
      'What is the worst idea you ever acted on?',
      'Which song do you secretly listen to even though it embarrasses you?',
      'What would you do if you were invisible for a day?',
      'When did you last lie, and about what?',
      'What was your biggest childhood dream?',
      'Which show have you watched the most times?',
      'What did you last laugh at so hard that you cried?',
      'Which superpower would you choose and why?',
      'What is the strangest thing you have ever eaten?',
      'Who in this group would you take to a desert island?',
      'What is your biggest superstition?',
      'Which app do you use the most, and how many hours a week?',
      'What was your worst haircut?',
      'Which word do you persistently mispronounce?',
      'What have you always wanted to do but never dared to?',
      'Which quality do you value most in yourself?',
      'What do you spend too much money on?',
    ],
    dare: [
      'Speak with an accent of your choice for one minute.',
      'Imitate an animal until someone guesses it.',
      'Dance for 30 seconds without music.',
      'Sing the chorus of a song the group picks.',
      'Tell a joke. The group rates it from 1 to 10.',
      'Strike your best model pose and hold it for 10 seconds.',
      'Speak only in questions for the next three minutes.',
      'Reveal your secret favourite snack and defend it.',
      'Walk around the room like a penguin.',
      'Invent a new word and explain what it means.',
      'Do ten squats while reciting the alphabet.',
      'Give a dramatic speech about your favourite movie.',
      'Read the back of a package like a newsreader.',
      'Give the person on your left an honest compliment.',
      'Tell a story where each sentence starts with the last letter of the previous one.',
      'Say “I am a robot” three times in a robot voice.',
      'Draw a portrait of someone in the group in 30 seconds.',
      'Act out a famous movie quote without words.',
      'Whisper for the whole next round.',
      'Pull your funniest face and hold it for 10 seconds.',
    ],
  },
};

export default {
  id: 'truth',
  category: 'fun',
  icon: 'truth',
  messages: {
    de: { title: 'Wahrheit oder Pflicht', desc: 'Fragen und Aufgaben für die nächste Runde.', keywords: 'wahrheit pflicht party spiel frage aufgabe', truth: 'Wahrheit', dare: 'Pflicht', random: 'Zufall', idle: 'Wähle Wahrheit, Pflicht oder überlass es dem Zufall.', tagTruth: 'Wahrheit', tagDare: 'Pflicht' },
    en: { title: 'Truth or dare', desc: 'Questions and challenges for your next round.', keywords: 'truth dare party game question challenge', truth: 'Truth', dare: 'Dare', random: 'Random', idle: 'Choose truth, dare or let chance decide.', tagTruth: 'Truth', tagDare: 'Dare' },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const content = CONTENT[ctx.lang] ?? CONTENT.en;
    const bags = { truth: [], dare: [] };
    const draw = (kind) => {
      if (!bags[kind].length) bags[kind] = shuffle(content[kind]);
      return bags[kind].pop();
    };

    const tag = h('span', { class: 'tod-tag' }, '');
    const text = h('p', { class: 'tod-text' }, t('idle'));
    const card = h('div', { class: 'tod-card is-idle' }, tag, text);
    const live = liveRegion();
    const history = createHistory({ max: 6 });

    const buttons = [];
    const run = (kind) =>
      whileBusy(buttons, async () => {
        const actual = kind === 'random' ? (chance(50) ? 'truth' : 'dare') : kind;
        const line = draw(actual);
        await play(card, [{ transform: 'rotateY(0)', opacity: 1 }, { transform: 'rotateY(90deg)', opacity: 0.4 }], { duration: dur(180), easing: 'ease-in' });
        card.className = `tod-card is-${actual}`;
        tag.textContent = actual === 'truth' ? t('tagTruth') : t('tagDare');
        text.textContent = line;
        await play(card, [{ transform: 'rotateY(-90deg)', opacity: 0.4 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: dur(320), easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
        settle(card, { transform: '' });
        live.textContent = `${tag.textContent}: ${line}`;
        history.add(`${tag.textContent}: ${line.length > 38 ? `${line.slice(0, 36)}…` : line}`);
      });

    const actions = ['truth', 'dare', 'random'].map((kind) => {
      const b = button({ label: t(kind), icon: kind === 'random' ? 'shuffle' : 'truth', variant: kind === 'random' ? 'secondary' : 'primary', size: 'lg', onClick: () => run(kind) });
      if (kind === 'random') b.dataset.shortcut = '';
      buttons.push(b);
      return b;
    });

    root.classList.add('is-single');
    root.append(h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, card, live), h('div', { class: 'stage-actions' }, ...actions)), history.el));
  },
};
