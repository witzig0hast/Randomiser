// Bedient die Anwendung im echten Chromium gegen den Produktions-Container (inkl. dessen CSP).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, act, idle, launch, openPage } from './helpers.mjs';

let browser;
let toolIds = [];
before(async () => {
  browser = await launch();
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/`);
  toolIds = await page.$$eval('.tool-card', (cards) => cards.map((c) => c.getAttribute('href').replace('#/', '')));
  await close();
});
after(() => browser?.close());

test('Startseite listet alle Werkzeuge', () => {
  assert.equal(toolIds.length, 22, toolIds.join(','));
});

for (const scheme of ['light', 'dark']) {
  test(`Jedes Werkzeug lädt und funktioniert ohne Fehler (${scheme})`, async () => {
    const { page, problems, close } = await openPage(browser, { colorScheme: scheme });
    for (const id of toolIds) {
      await page.goto(`${BASE}/#/${id}`);
      await page.waitForSelector('.tool-title');
      await act(page);
      assert.deepEqual(problems, [], `${id}: ${problems.join(' | ')}`);
    }
    await close();
  });
}

test('Mit echten Animationen bleibt kein Werkzeug hängen', async () => {
  const { page, problems, close } = await openPage(browser, { reducedMotion: 'no-preference' });
  for (const id of toolIds) {
    await page.goto(`${BASE}/#/${id}`);
    await act(page);
  }
  assert.deepEqual(problems, []);
  await close();
});

test('Sprache folgt dem Browser und ist umschaltbar', async () => {
  const { page, close } = await openPage(browser, { locale: 'en-US' });
  await page.goto(`${BASE}/`);
  assert.equal(await page.textContent('.hero-title'), 'Randomness. Fair and instant.');
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  await page.click('.lang-switch >> text=DE');
  assert.equal(await page.textContent('.hero-title'), 'Zufall. Fair und sofort.');
  await page.reload();
  assert.equal(await page.textContent('.hero-title'), 'Zufall. Fair und sofort.', 'Wahl wird gemerkt');
  await close();
});

test('Mobil (390 px): keine horizontale Scrollleiste', async () => {
  const { page, close } = await openPage(browser, { viewport: { width: 390, height: 844 } });
  for (const id of ['', ...toolIds]) {
    await page.goto(`${BASE}/#/${id}`);
    await page.waitForSelector('h1');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${id || 'Startseite'}: ${overflow}px zu breit`);
  }
  await close();
});

test('Suche und Kategorien filtern', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/`);
  await page.keyboard.press('/');
  await page.keyboard.type('würfel');
  assert.deepEqual(await page.$$eval('.tool-card', (c) => c.map((x) => x.getAttribute('href'))), ['#/dice']);
  await page.fill('.search-input', '');
  await page.click('.chip >> text=Spaß');
  assert.equal(await page.locator('.tool-card').count(), 3);
  await close();
});

test('Zufallsauswahl entfernt bei Duplikaten nur den gezogenen Eintrag', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/picker`);
  await page.fill('textarea', 'A\nA\nA\nA\nA\nA\nA\nA\nA\nB');
  await page.click('.switch');
  for (let i = 9; i >= 4; i--) {
    await page.click('.stage .btn-primary');
    await idle(page);
    assert.equal((await page.inputValue('textarea')).split('\n').filter(Boolean).length, i);
  }
  await close();
});

test('Würfel mit eigener Seitenzahl: kein falscher Typ aktiv, Werte im Bereich', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/dice`);
  const custom = page.locator('.controls-col input[type=number]').first();
  await custom.fill('7');
  await custom.blur();
  await page.reload();
  assert.equal(await page.locator('.segmented-item.is-active', { hasText: /^W/ }).count(), 0);
  for (let i = 0; i < 5; i++) {
    await page.click('.stage .btn-primary');
    await idle(page);
    for (const face of await page.locator('.die').allTextContents()) assert.ok(+face >= 1 && +face <= 7, face);
  }
  await close();
});

test('Münze startet den nächsten Wurf in der aktuellen Lage', async () => {
  const { page, close } = await openPage(browser, { reducedMotion: 'no-preference' });
  await page.goto(`${BASE}/#/coin`);
  let checked = 0;
  for (let i = 0; i < 20 && checked < 2; i++) {
    await page.click('.stage .btn-primary');
    await idle(page);
    if ((await page.locator('.history-item').first().textContent()) !== 'Zahl') continue;
    await page.click('.stage .btn-primary');
    const cos = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.coin')).transform).m22);
    assert.ok(cos < -0.9, `Münze springt (cos ${cos})`);
    checked++;
    await idle(page);
  }
  assert.ok(checked > 0, 'kein „Zahl“-Wurf in 20 Versuchen');
  await close();
});

test('Leertaste löst die Hauptaktion aus, aber nicht in Eingabefeldern', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/yesno`);
  await page.keyboard.press('Space');
  await idle(page);
  assert.equal(await page.locator('.history-item').count(), 1);
  await page.goto(`${BASE}/#/picker`);
  await page.click('textarea');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.history-item').count(), 0);
  await close();
});

test('Gesperrte Farbe bleibt beim Neuziehen erhalten', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/color`);
  const first = () => page.locator('.swatch-value').first().textContent();
  const locked = await first();
  await page.click('.swatch-lock >> nth=0');
  for (let i = 0; i < 3; i++) await page.click('.stage .btn-primary');
  assert.equal(await first(), locked);
  await close();
});

test('Passwort erfüllt die gewählten Regeln', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/password`);
  for (let i = 0; i < 10; i++) {
    await page.click('.stage .btn-primary');
    const pw = await page.textContent('.pw-output');
    assert.equal(pw.length, 20);
    assert.match(pw, /[a-z]/);
    assert.match(pw, /[A-Z]/);
    assert.match(pw, /[0-9]/);
  }
  await close();
});

test('Lotto 6 aus 49: sechs verschiedene, sortierte Zahlen plus Superzahl', async () => {
  const { page, close } = await openPage(browser);
  await page.goto(`${BASE}/#/lottery`);
  for (let i = 0; i < 10; i++) {
    await page.click('.stage .btn-primary');
    await idle(page);
    const main = (await page.locator('.lotto-ball:not(.is-extra)').allTextContents()).map(Number);
    const extra = (await page.locator('.lotto-ball.is-extra').allTextContents()).map(Number);
    assert.equal(new Set(main).size, 6);
    assert.deepEqual(main, [...main].sort((a, b) => a - b));
    assert.ok(main.every((n) => n >= 1 && n <= 49));
    assert.ok(extra.length === 1 && extra[0] >= 0 && extra[0] <= 9);
  }
  await close();
});
