import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CSP } from '../scripts/csp.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Nginx und lokaler Server verwenden dieselbe Content-Security-Policy', () => {
  assert.ok(read('nginx/security-headers.conf').includes(`"${CSP}"`), 'CSP in nginx/security-headers.conf weicht von scripts/csp.mjs ab');
});

test('Die CSP erlaubt weder Inline-Code noch fremde Quellen', () => {
  assert.doesNotMatch(CSP, /unsafe-inline|unsafe-eval|https?:|\*/);
  assert.match(CSP, /default-src 'none'/);
  assert.match(CSP, /frame-ancestors 'none'/);
});

test('index.html enthält keine Inline-Skripte, Inline-Styles oder externen Ressourcen', () => {
  const html = read('src/index.html');
  assert.doesNotMatch(html, /<style/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, 'Inline-<script> gefunden');
  assert.doesNotMatch(html, /(src|href)=["']https?:/i);
});

/** Alle Quelldateien rekursiv sammeln. */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test('Quellcode nutzt weder innerHTML noch Math.random noch eval', () => {
  const root = new URL('../src/js', import.meta.url).pathname;
  for (const file of walk(root).filter((f) => f.endsWith('.js'))) {
    const code = readFileSync(file, 'utf8');
    assert.doesNotMatch(code, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/, `${file}: HTML-Injektion`);
    assert.doesNotMatch(code, /Math\.random\(/, `${file}: Math.random statt Web Crypto`);
    assert.doesNotMatch(code, /\beval\(|new Function\(/, `${file}: dynamische Code-Ausführung`);
  }
});

test('Jedes Werkzeug hat Titel und Beschreibung in allen Sprachen', async () => {
  // Importiert die Werkzeuge direkt; sie benötigen im Modulkontext kein DOM.
  const files = readdirSync(new URL('../src/js/tools', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'index.js');
  assert.ok(files.length >= 20);
  for (const file of files) {
    const src = read(`src/js/tools/${file}`);
    for (const lang of ['de', 'en']) {
      assert.match(src, new RegExp(`${lang}: \\{[\\s\\S]*?title:`), `${file}: Titel (${lang}) fehlt`);
      assert.match(src, new RegExp(`${lang}: \\{[\\s\\S]*?desc:`), `${file}: Beschreibung (${lang}) fehlt`);
    }
  }
});
