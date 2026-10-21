import { h } from '../dom.js';
import { getLanguage } from '../i18n.js';
import { randomInt } from '../lib/random.js';
import { flicker } from '../motion.js';
import { button, copyButton, createHistory, field, liveRegion, panel, segmented, stepper, whileBusy } from '../ui.js';

const pad = (n) => String(n).padStart(2, '0');
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function parseMinutes(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export default {
  id: 'datetime',
  category: 'text',
  icon: 'datetime',
  messages: {
    de: {
      title: 'Zufallsdatum & Uhrzeit',
      desc: 'Ein zufälliger Tag oder eine zufällige Uhrzeit im Zeitraum deiner Wahl.',
      keywords: 'datum zeit uhrzeit termin tag kalender',
      go: 'Ziehen',
      kind: 'Was soll gezogen werden?',
      date: 'Datum',
      time: 'Uhrzeit',
      both: 'Beides',
      from: 'Von',
      to: 'Bis',
      count: 'Anzahl',
      idle: 'Lege einen Zeitraum fest und ziehe.',
      err: 'Das Startdatum liegt nach dem Enddatum.',
      errTime: 'Die Startzeit liegt nach der Endzeit.',
      errInvalid: 'Bitte gib gültige Werte ein.',
    },
    en: {
      title: 'Random date & time',
      desc: 'A random day or time within the range of your choice.',
      keywords: 'date time clock appointment day calendar',
      go: 'Draw',
      kind: 'What to draw?',
      date: 'Date',
      time: 'Time',
      both: 'Both',
      from: 'From',
      to: 'To',
      count: 'Count',
      idle: 'Set a range and draw.',
      err: 'The start date is after the end date.',
      errTime: 'The start time is after the end time.',
      errInvalid: 'Please enter valid values.',
    },
  },
  mount(root, ctx) {
    const { t } = ctx;
    const locale = getLanguage();
    const result = h('div', { class: 'datetime-result' }, h('span', { class: 'datetime-line is-idle' }, '—'));
    const note = h('p', { class: 'stage-note' }, t('idle'));
    const live = liveRegion();
    const history = createHistory();
    let last = '';

    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const fromDate = h('input', { class: 'input', type: 'date', value: toInputDate(today) });
    const toDate = h('input', { class: 'input', type: 'date', value: toInputDate(nextYear) });
    const fromTime = h('input', { class: 'input', type: 'time', value: '00:00' });
    const toTime = h('input', { class: 'input', type: 'time', value: '23:59' });
    const dateFields = h('div', { class: 'form-grid' }, field(t('from'), fromDate), field(t('to'), toDate));
    const timeFields = h('div', { class: 'form-grid' }, field(`${t('from')} (${t('time')})`, fromTime), field(`${t('to')} (${t('time')})`, toTime));
    const kind = segmented({
      label: t('kind'),
      options: ['date', 'time', 'both'].map((value) => ({ value, label: t(value) })),
      value: ctx.load('kind', 'date'),
      onChange: (v) => (ctx.save('kind', v), sync()),
    });
    const count = stepper({ label: t('count'), value: 1, min: 1, max: 10 });

    function sync() {
      const k = kind.get();
      dateFields.hidden = k === 'time';
      timeFields.hidden = k === 'date';
    }

    const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });
    const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
    const bothFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' });

    function drawOne(k, from, to, fromMin, toMin) {
      if (k === 'date') return dateFmt.format(new Date(from.getFullYear(), from.getMonth(), from.getDate() + randomInt(0, Math.round((to - from) / 86400000))));
      if (k === 'time') {
        const minute = randomInt(fromMin, toMin);
        return timeFmt.format(new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60));
      }
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(fromMin / 60), fromMin % 60).getTime();
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), Math.floor(toMin / 60), toMin % 60).getTime();
      return bothFmt.format(new Date(Math.floor(randomInt(start, end) / 60000) * 60000));
    }

    const go = button({
      label: t('go'),
      icon: 'datetime',
      variant: 'primary',
      size: 'lg',
      onClick: () =>
        whileBusy(go, async () => {
          note.classList.remove('is-error');
          const k = kind.get();
          const from = parseDate(fromDate.value);
          const to = parseDate(toDate.value);
          const fromMin = parseMinutes(fromTime.value);
          const toMin = parseMinutes(toTime.value);
          const fail = (message) => (note.classList.add('is-error'), (note.textContent = message));
          if ((k !== 'time' && (!from || !to)) || (k !== 'date' && (fromMin === null || toMin === null))) return fail(t('errInvalid'));
          if (k !== 'time' && from > to) return fail(t('err'));
          if (k !== 'date' && (k === 'time' || +from === +to) && fromMin > toMin) return fail(t('errTime'));
          note.textContent = '';
          const values = Array.from({ length: count.get() }, () => drawOne(k, from, to, fromMin, toMin));
          const lines = values.map(() => h('span', { class: 'datetime-line' }, ''));
          result.replaceChildren(...lines);
          await Promise.all(lines.map((line, i) => flicker(line, () => drawOne(k, from ?? today, to ?? today, fromMin ?? 0, toMin ?? 1439), values[i], { steps: 8 })));
          last = values.join('\n');
          live.textContent = values.join('; ');
          history.add(values.length > 1 ? `${values[0]} …` : values[0]);
        }),
    });

    sync();
    root.append(
      h('div', { class: 'stage-col' }, h('section', { class: 'stage' }, h('div', { class: 'stage-display' }, result, note, live), h('div', { class: 'stage-actions' }, go, copyButton(() => last))), history.el),
      h('div', { class: 'controls-col' }, panel(null, kind.el, dateFields, timeFields, count.el)),
    );
  },
};
