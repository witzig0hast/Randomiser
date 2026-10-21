import { h } from '../dom.js';
import { CHARSETS, generatePassword, pick } from '../lib/random.js';
import { tween } from '../motion.js';
import { button, copyButton, liveRegion, panel, slider, switchField } from '../ui.js';

const LEVELS = ['veryWeak', 'weak', 'fair', 'strong', 'veryStrong'];
const levelFor = (bits) => (bits < 36 ? 0 : bits < 60 ? 1 : bits < 80 ? 2 : bits < 110 ? 3 : 4);

function paint(el, text) {
  el.replaceChildren(...[...text].map((c) => h('span', { class: /[0-9]/.test(c) ? 'ch-digit' : /[A-Za-z]/.test(c) ? '' : 'ch-symbol' }, c)));
}

export default {
  id: 'password',
  category: 'text',
  icon: 'password',
  messages: {
    de: {
      title: 'Passwort-Generator',
      desc: 'Sichere Passwörter, lokal erzeugt und nie gespeichert.',
      keywords: 'kennwort sicher generator zeichen passwort passphrase',
      generate: 'Neu erzeugen',
      length: 'Länge',
      lower: 'Kleinbuchstaben (a–z)',
      upper: 'Großbuchstaben (A–Z)',
      digits: 'Ziffern (0–9)',
      symbols: 'Sonderzeichen (!@#…)',
      ambiguous: 'Mehrdeutige Zeichen vermeiden',
      ambiguousHint: 'Lässt 0 O 1 l I | und Anführungszeichen weg.',
      entropy: '{bits} Bit Entropie',
      strength: 'Stärke',
      veryWeak: 'Sehr schwach',
      weak: 'Schwach',
      fair: 'Ordentlich',
      strong: 'Stark',
      veryStrong: 'Sehr stark',
      needSet: 'Wähle mindestens eine Zeichengruppe.',
      privacy: 'Das Passwort entsteht nur in deinem Browser. Es wird weder gesendet noch gespeichert.',
    },
    en: {
      title: 'Password generator',
      desc: 'Strong passwords, generated locally and never stored.',
      keywords: 'secure generator characters password passphrase',
      generate: 'Generate new',
      length: 'Length',
      lower: 'Lowercase (a–z)',
      upper: 'Uppercase (A–Z)',
      digits: 'Digits (0–9)',
      symbols: 'Symbols (!@#…)',
      ambiguous: 'Avoid ambiguous characters',
      ambiguousHint: 'Leaves out 0 O 1 l I | and quotation marks.',
      entropy: '{bits} bits of entropy',
      strength: 'Strength',
      veryWeak: 'Very weak',
      weak: 'Weak',
      fair: 'Fair',
      strong: 'Strong',
      veryStrong: 'Very strong',
      needSet: 'Select at least one character group.',
      privacy: 'The password is created in your browser only. It is never sent or stored.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const out = h('output', { class: 'pw-output', 'aria-label': ctx.t('title') });
    const meter = h('div', { class: 'meter', role: 'img' }, LEVELS.map(() => h('span', { class: 'meter-seg' })));
    const meterLabel = h('p', { class: 'pw-strength' });
    const note = h('p', { class: 'stage-note' }, t('privacy'));
    const live = liveRegion();
    let current = '';
    let busy = false;

    const length = slider({ label: t('length'), min: 8, max: 128, value: ctx.load('length', 20), onInput: (v) => (ctx.save('length', v), generate(false)) });
    const toggles = {
      lower: switchField({ label: t('lower'), checked: ctx.load('lower', true), onChange: () => onToggle() }),
      upper: switchField({ label: t('upper'), checked: ctx.load('upper', true), onChange: () => onToggle() }),
      digits: switchField({ label: t('digits'), checked: ctx.load('digits', true), onChange: () => onToggle() }),
      symbols: switchField({ label: t('symbols'), checked: ctx.load('symbols', true), onChange: () => onToggle() }),
    };
    const ambiguous = switchField({ label: t('ambiguous'), hint: t('ambiguousHint'), checked: ctx.load('ambiguous', false), onChange: (v) => (ctx.save('ambiguous', v), generate(false)) });

    function onToggle() {
      for (const [name, sw] of Object.entries(toggles)) ctx.save(name, sw.get());
      generate(false);
    }

    function generate(animate) {
      const sets = Object.entries(toggles).filter(([, sw]) => sw.get()).map(([name]) => name);
      note.classList.remove('is-error');
      if (!sets.length) {
        note.textContent = t('needSet');
        note.classList.add('is-error');
        return;
      }
      note.textContent = t('privacy');
      const { password, entropyBits } = generatePassword({ length: length.get(), sets, excludeAmbiguous: ambiguous.get() });
      current = password;
      const level = levelFor(entropyBits);
      [...meter.children].forEach((seg, i) => seg.classList.toggle('is-on', i <= level));
      meter.dataset.level = String(level);
      meter.setAttribute('aria-label', `${t('strength')}: ${t(LEVELS[level])}`);
      meterLabel.textContent = `${t(LEVELS[level])} · ${t('entropy', { bits: entropyBits })}`;
      live.textContent = '';
      if (!animate) return paint(out, password);
      const pool = sets.flatMap((name) => [...CHARSETS[name]]);
      busy = true;
      tween(520, (p) => {
        const revealed = Math.floor(password.length * p);
        paint(out, password.slice(0, revealed) + [...password.slice(revealed)].map(() => pick(pool)).join(''));
      }).then(() => {
        paint(out, current);
        busy = false;
      });
    }

    const again = button({ label: t('generate'), icon: 'refresh', variant: 'primary', size: 'lg', onClick: () => !busy && generate(true) });

    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display is-stretch' }, out, meter, meterLabel, note, live), h('div', { class: 'stage-actions' }, again, copyButton(() => current, { variant: 'secondary', size: undefined })))),
      h('div', { class: 'controls-col' }, panel(null, length.el, h('div', { class: 'panel-stack' }, ...Object.values(toggles).map((sw) => sw.el), ambiguous.el))),
    );
    generate(false);
  },
};
