import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hslToRgb, rgbToHsl, rgbToHex, readableOn } from '../src/js/lib/color.js';

test('hslToRgb liefert bekannte Farben', () => {
  assert.deepEqual(hslToRgb(0, 100, 50), [255, 0, 0]);
  assert.deepEqual(hslToRgb(120, 100, 50), [0, 255, 0]);
  assert.deepEqual(hslToRgb(240, 100, 50), [0, 0, 255]);
  assert.deepEqual(hslToRgb(0, 0, 100), [255, 255, 255]);
  assert.deepEqual(hslToRgb(0, 0, 0), [0, 0, 0]);
});

test('rgbToHsl ist die Umkehrung (innerhalb der Rundung)', () => {
  assert.deepEqual(rgbToHsl(255, 0, 0), [0, 100, 50]);
  assert.deepEqual(rgbToHsl(0, 0, 255), [240, 100, 50]);
  assert.deepEqual(rgbToHsl(128, 128, 128), [0, 0, 50]);
  for (const [h, s, l] of [[30, 60, 40], [200, 80, 55], [310, 45, 70]]) {
    const [r, g, b] = hslToRgb(h, s, l);
    const [h2, s2, l2] = rgbToHsl(r, g, b);
    assert.ok(Math.abs(h - h2) <= 2 && Math.abs(s - s2) <= 2 && Math.abs(l - l2) <= 2);
  }
});

test('rgbToHex formatiert zweistellig in Großbuchstaben', () => {
  assert.equal(rgbToHex(0, 10, 255), '#000AFF');
});

test('readableOn wählt kontrastreiche Schrift', () => {
  assert.equal(readableOn(255, 255, 255), '#16150f');
  assert.equal(readableOn(0, 0, 0), '#ffffff');
  assert.equal(readableOn(30, 60, 160), '#ffffff');
});
