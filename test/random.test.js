import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  randomBelow,
  randomInt,
  randomFloat,
  randomDecimal,
  chance,
  shuffle,
  sample,
  uniqueInts,
  rollDice,
  parseDice,
  splitIntoTeams,
  parseList,
  generatePassword,
  uuidV4,
  CHARSETS,
} from '../src/js/lib/random.js';

/** Chi-Quadrat-Statistik gegen die Gleichverteilung. */
function chiSquare(counts, total) {
  const expected = total / counts.length;
  return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
}

test('randomInt bleibt in den Grenzen und trifft beide Enden', () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const v = randomInt(-3, 3);
    assert.ok(v >= -3 && v <= 3);
    seen.add(v);
  }
  assert.equal(seen.size, 7);
});

test('randomInt ist gleichverteilt (Chi-Quadrat, 5 Freiheitsgrade)', () => {
  const total = 60000;
  const counts = new Array(6).fill(0);
  for (let i = 0; i < total; i++) counts[randomInt(0, 5)]++;
  // kritischer Wert p = 0.0001 bei 5 Freiheitsgraden ≈ 25.7
  assert.ok(chiSquare(counts, total) < 25.7, `Verteilung auffällig: ${counts}`);
});

test('randomInt funktioniert für große Bereiche', () => {
  for (let i = 0; i < 200; i++) {
    const v = randomInt(0, Number.MAX_SAFE_INTEGER);
    assert.ok(Number.isSafeInteger(v) && v >= 0);
  }
  assert.equal(randomInt(5, 5), 5);
});

test('randomInt/randomBelow lehnen ungültige Eingaben ab', () => {
  assert.throws(() => randomInt(3, 1), RangeError);
  assert.throws(() => randomInt(1.5, 3), RangeError);
  assert.throws(() => randomBelow(0), RangeError);
  assert.throws(() => randomBelow(Infinity), RangeError);
});

test('randomFloat liegt in [0, 1)', () => {
  for (let i = 0; i < 2000; i++) {
    const v = randomFloat();
    assert.ok(v >= 0 && v < 1);
  }
});

test('randomDecimal respektiert Grenzen und Nachkommastellen', () => {
  for (let i = 0; i < 2000; i++) {
    const v = randomDecimal(1.25, 1.75, 2);
    assert.ok(v >= 1.25 && v <= 1.75);
    assert.equal(Math.round(v * 100) / 100, v);
  }
  assert.throws(() => randomDecimal(1.001, 1.002, 2), RangeError);
});

test('chance verhält sich an den Rändern deterministisch', () => {
  assert.equal(chance(0), false);
  assert.equal(chance(100), true);
  let yes = 0;
  for (let i = 0; i < 20000; i++) if (chance(70)) yes++;
  assert.ok(Math.abs(yes / 20000 - 0.7) < 0.03);
});

test('shuffle liefert eine Permutation und verändert das Original nicht', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = input.slice();
  const out = shuffle(input);
  assert.deepEqual(input, copy);
  assert.deepEqual(out.slice().sort(), copy);
});

test('shuffle verteilt Positionen gleichmäßig', () => {
  const total = 30000;
  const counts = new Array(4).fill(0);
  for (let i = 0; i < total; i++) counts[shuffle([0, 1, 2, 3]).indexOf(0)]++;
  // 3 Freiheitsgrade, p = 0.0001 ≈ 21.1
  assert.ok(chiSquare(counts, total) < 21.1, `Verteilung auffällig: ${counts}`);
});

test('sample zieht ohne Zurücklegen', () => {
  const out = sample([1, 2, 3, 4, 5], 5);
  assert.deepEqual(out.slice().sort(), [1, 2, 3, 4, 5]);
  assert.equal(sample([1, 2, 3], 0).length, 0);
  assert.throws(() => sample([1, 2], 3), RangeError);
});

test('uniqueInts liefert verschiedene Werte im Bereich', () => {
  for (let i = 0; i < 300; i++) {
    const out = uniqueInts(1, 49, 6);
    assert.equal(new Set(out).size, 6);
    assert.ok(out.every((n) => n >= 1 && n <= 49));
  }
  assert.deepEqual(uniqueInts(1, 5, 5).sort(), [1, 2, 3, 4, 5]);
  assert.equal(uniqueInts(0, 1e12, 10).length, 10);
  assert.throws(() => uniqueInts(1, 3, 4), RangeError);
});

test('uniqueInts zieht jede Zahl gleich häufig', () => {
  const total = 20000;
  const counts = new Array(10).fill(0);
  for (let i = 0; i < total; i++) for (const n of uniqueInts(1, 10, 3)) counts[n - 1]++;
  assert.ok(chiSquare(counts, total * 3) < 27.9, `Verteilung auffällig: ${counts}`); // 9 FG, p = 0.001
});

test('rollDice würfelt im gültigen Bereich', () => {
  const rolls = rollDice(500, 20);
  assert.equal(rolls.length, 500);
  assert.ok(rolls.every((n) => n >= 1 && n <= 20));
});

test('parseDice erkennt Notation', () => {
  assert.deepEqual(parseDice('3d6+2'), { count: 3, sides: 6, mod: 2 });
  assert.deepEqual(parseDice('D20'), { count: 1, sides: 20, mod: 0 });
  assert.deepEqual(parseDice(' 2W10 - 1 '), { count: 2, sides: 10, mod: -1 });
  assert.equal(parseDice('0d6'), null);
  assert.equal(parseDice('1d1'), null);
  assert.equal(parseDice('101d6'), null);
  assert.equal(parseDice('abc'), null);
  assert.equal(parseDice('1d6+99999'), null);
});

test('splitIntoTeams verteilt vollständig und ausgewogen', () => {
  const people = Array.from({ length: 11 }, (_, i) => `P${i}`);
  const teams = splitIntoTeams(people, 3);
  assert.equal(teams.length, 3);
  assert.deepEqual(teams.flat().sort(), people.slice().sort());
  const sizes = teams.map((t) => t.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
});

test('parseList trimmt, entfernt Leerzeilen und begrenzt', () => {
  assert.deepEqual(parseList('  a \n\n b\r\n   \nc'), ['a', 'b', 'c']);
  assert.equal(parseList('x'.repeat(200))[0].length, 80);
  assert.equal(parseList(Array.from({ length: 900 }, (_, i) => i + 1).join('\n')).length, 500);
});

test('generatePassword erfüllt Länge und Gruppen', () => {
  for (let i = 0; i < 300; i++) {
    const { password, entropyBits } = generatePassword({ length: 12, sets: ['lower', 'upper', 'digits', 'symbols'] });
    assert.equal(password.length, 12);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
    assert.ok([...password].some((c) => CHARSETS.symbols.includes(c)));
    assert.ok(entropyBits > 60);
  }
});

test('generatePassword schließt mehrdeutige Zeichen aus', () => {
  for (let i = 0; i < 300; i++) {
    const { password } = generatePassword({ length: 40, sets: ['lower', 'upper', 'digits'], excludeAmbiguous: true });
    assert.doesNotMatch(password, /[0O1lI|]/);
  }
  assert.throws(() => generatePassword({ length: 1, sets: ['lower', 'upper'] }), RangeError);
  assert.throws(() => generatePassword({ sets: [] }), RangeError);
});

test('uuidV4 hat gültiges Format', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const id = uuidV4();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    seen.add(id);
  }
  assert.equal(seen.size, 200);
});
