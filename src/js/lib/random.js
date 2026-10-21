/**
 * Zufallskern der Plattform.
 *
 * Alle Werte stammen aus `crypto.getRandomValues` (Web Crypto) und werden per
 * Rejection Sampling gezogen, damit es keinen Modulo-Bias gibt. Der nicht
 * kryptografische Standardgenerator der Sprache wird bewusst nirgends verwendet.
 */

const TWO_32 = 2 ** 32;
const TWO_53 = 2 ** 53;

function fill(typedArray) {
  return globalThis.crypto.getRandomValues(typedArray);
}

function randomUint32() {
  return fill(new Uint32Array(1))[0];
}

/** Gleichverteilte 53-Bit-Ganzzahl in [0, 2^53). */
function random53() {
  const [hi, lo] = fill(new Uint32Array(2));
  return hi * 2 ** 21 + (lo >>> 11);
}

/** Gleichverteilte Ganzzahl in [0, n). `n` darf bis 2^53 groß sein. */
export function randomBelow(n) {
  if (!Number.isInteger(n) || n < 1 || n > TWO_53) {
    throw new RangeError('randomBelow: n muss eine ganze Zahl zwischen 1 und 2^53 sein');
  }
  if (n === 1) return 0;
  if (n <= TWO_32) {
    const limit = TWO_32 - (TWO_32 % n);
    let x;
    do x = randomUint32();
    while (x >= limit);
    return x % n;
  }
  const limit = TWO_53 - (TWO_53 % n);
  let x;
  do x = random53();
  while (x >= limit);
  return x % n;
}

/** Gleichverteilte Ganzzahl in [min, max], beide Grenzen eingeschlossen. */
export function randomInt(min, max) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new RangeError('randomInt: Grenzen müssen ganze Zahlen sein');
  }
  if (min > max) throw new RangeError('randomInt: min darf nicht größer als max sein');
  return min + randomBelow(max - min + 1);
}

/** Gleichverteilte Kommazahl in [0, 1) mit voller 53-Bit-Auflösung. */
export function randomFloat() {
  return random53() / TWO_53;
}

/**
 * Gleichverteilte Dezimalzahl in [min, max] mit `decimals` Nachkommastellen.
 * Es wird im skalierten Ganzzahlraum gezogen, damit jeder darstellbare Wert
 * gleich wahrscheinlich ist und die Grenzen nie überschritten werden.
 */
export function randomDecimal(min, max, decimals = 2) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new RangeError('randomDecimal: Grenzen müssen endlich sein');
  }
  const scale = 10 ** decimals;
  const lo = Math.ceil(min * scale - 1e-9);
  const hi = Math.floor(max * scale + 1e-9);
  if (lo > hi) throw new RangeError('randomDecimal: leerer Bereich');
  return randomInt(lo, hi) / scale;
}

/** Wahr mit der Wahrscheinlichkeit `percent` (0–100). */
export function chance(percent) {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return randomFloat() * 100 < percent;
}

/** Zufälliges Element eines nicht leeren Arrays. */
export function pick(items) {
  if (!items.length) throw new RangeError('pick: leere Liste');
  return items[randomBelow(items.length)];
}

/** Fisher-Yates-Mischung. Gibt eine neue Liste zurück, das Original bleibt unverändert. */
export function shuffle(items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` verschiedene Elemente (ohne Zurücklegen) in zufälliger Reihenfolge. */
export function sample(items, count) {
  if (count > items.length) throw new RangeError('sample: mehr Elemente angefordert als vorhanden');
  const pool = items.slice();
  for (let i = 0; i < count; i++) {
    const j = i + randomBelow(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * `count` verschiedene Ganzzahlen aus [min, max] (Floyd-Algorithmus, O(count)),
 * auch für riesige Bereiche geeignet. Reihenfolge ist zufällig.
 */
export function uniqueInts(min, max, count) {
  const size = max - min + 1;
  if (!Number.isSafeInteger(size) || size < 1) throw new RangeError('uniqueInts: ungültiger Bereich');
  if (count > size) throw new RangeError('uniqueInts: Bereich zu klein');
  const chosen = new Set();
  for (let j = size - count; j < size; j++) {
    const t = randomBelow(j + 1);
    chosen.add(chosen.has(t) ? j : t);
  }
  return shuffle([...chosen].map((v) => v + min));
}

/** Würfelt `count` Würfel mit `sides` Seiten. */
export function rollDice(count, sides) {
  return Array.from({ length: count }, () => randomInt(1, sides));
}

/**
 * Parst Würfelnotation wie `3d6+2`, `D20`, `2W10-1` (d/w, Groß-/Kleinschreibung egal).
 * Gibt `null` zurück, wenn die Eingabe ungültig oder außerhalb der Grenzen ist.
 */
export function parseDice(input, { maxCount = 100, maxSides = 1000, maxMod = 10000 } = {}) {
  const m = /^\s*(\d{1,3})?\s*[dw]\s*(\d{1,4})\s*(?:([+-])\s*(\d{1,5}))?\s*$/i.exec(String(input));
  if (!m) return null;
  const count = m[1] === undefined ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  const mod = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
  if (count < 1 || count > maxCount || sides < 2 || sides > maxSides || Math.abs(mod) > maxMod) return null;
  return { count, sides, mod };
}

/** Teilt `items` zufällig auf Gruppen auf. Die Gruppengrößen unterscheiden sich um höchstens 1. */
export function splitIntoTeams(items, teamCount) {
  if (!Number.isInteger(teamCount) || teamCount < 1) throw new RangeError('splitIntoTeams: ungültige Teamanzahl');
  const teams = Array.from({ length: teamCount }, () => []);
  shuffle(items).forEach((item, i) => teams[i % teamCount].push(item));
  return teams;
}

/** Liest eine zeilenweise Liste ein: trimmt, entfernt Leerzeilen und kürzt zu lange Einträge. */
export function parseList(text, { maxItems = 500, maxLength = 80 } = {}) {
  const items = [];
  for (const line of String(text).split(/\r?\n/)) {
    const value = line.trim().slice(0, maxLength).trim();
    if (value) items.push(value);
    if (items.length >= maxItems) break;
  }
  return items;
}

export const CHARSETS = Object.freeze({
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
});

const AMBIGUOUS = new Set('0O1lI|`\'"');

/**
 * Erzeugt ein Passwort. Aus jeder gewählten Zeichengruppe kommt mindestens ein
 * Zeichen vor; der Rest wird gleichverteilt aus dem gesamten Vorrat gezogen und
 * anschließend gemischt.
 * Rückgabe: `{ password, poolSize, entropyBits }`.
 */
export function generatePassword({ length = 20, sets = ['lower', 'upper', 'digits'], excludeAmbiguous = false } = {}) {
  const groups = sets
    .filter((name) => CHARSETS[name])
    .map((name) => [...CHARSETS[name]].filter((c) => !excludeAmbiguous || !AMBIGUOUS.has(c)));
  if (!groups.length) throw new RangeError('generatePassword: keine Zeichengruppe gewählt');
  if (length < groups.length) throw new RangeError('generatePassword: Länge kleiner als Anzahl der Gruppen');
  const pool = groups.flat();
  const chars = groups.map((g) => pick(g));
  while (chars.length < length) chars.push(pick(pool));
  return {
    password: shuffle(chars).join(''),
    poolSize: pool.length,
    entropyBits: Math.floor(length * Math.log2(pool.length)),
  };
}

/** UUID v4 aus der Web-Crypto-Quelle. */
export function uuidV4() {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const b = fill(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
