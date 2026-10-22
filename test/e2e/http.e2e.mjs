// Prüft den Produktions-Container auf HTTP-Ebene: Header, Caching, erlaubte Methoden, Rate-Limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CSP } from '../../scripts/csp.mjs';
import { BASE } from './helpers.mjs';

const get = (path, init) => fetch(`${BASE}${path}`, { redirect: 'manual', ...init });

test('Startseite: Sicherheits-Header und kein Cache', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  const h = res.headers;
  assert.equal(h.get('content-security-policy'), CSP);
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.equal(h.get('x-frame-options'), 'DENY');
  assert.equal(h.get('referrer-policy'), 'no-referrer');
  assert.match(h.get('permissions-policy'), /camera=\(\)/);
  assert.equal(h.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(h.get('cache-control'), 'no-cache');
  assert.equal(h.get('server'), 'nginx', 'Server-Header verrät keine Version');
});

test('Assets: gehasht, ein Jahr unveränderlich gecacht, komprimiert', async () => {
  const html = await (await get('/')).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.equal(assets.length, 3, 'boot.js, app.js und styles.css');
  for (const path of assets) {
    assert.match(path, /-[A-Z0-9]{8}\.(js|css)$/, `${path} trägt keinen Hash`);
    const res = await get(path, { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=31536000, immutable', path);
    assert.ok(res.headers.get('content-security-policy'), `${path} ohne CSP`);
    if (!path.includes('boot-')) assert.equal(res.headers.get('content-encoding'), 'gzip', path);
  }
});

test('Nur GET und HEAD sind erlaubt', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    assert.equal((await get('/', { method })).status, 405, method);
  }
  assert.equal((await get('/', { method: 'HEAD' })).status, 200);
});

test('Versteckte Dateien, Quellkarten und Unbekanntes liefern 404', async () => {
  for (const path of ['/.git/config', '/.env', '/assets/app.js.map', '/gibt-es-nicht', '/../etc/passwd']) {
    assert.equal((await get(path)).status, 404, path);
  }
});

test('Healthcheck antwortet', async () => {
  const res = await get('/healthz');
  assert.equal(res.status, 200);
  assert.equal((await res.text()).trim(), 'ok');
});

test('Rate-Limit: Flut von einer IP wird gebremst, andere IPs bleiben frei', async () => {
  // Client-IP kommt wie hinter Cloudflare aus CF-Connecting-IP (der Test-Container liegt im privaten Docker-Netz).
  const flood = await Promise.all(Array.from({ length: 250 }, () => get('/', { headers: { 'cf-connecting-ip': '203.0.113.10' } }).then((r) => r.status)));
  const ok = flood.filter((s) => s === 200).length;
  const limited = flood.filter((s) => s === 429).length;
  assert.ok(limited > 100, `nur ${limited}× 429`);
  assert.ok(ok >= 30, `nur ${ok}× 200 (Burst sollte ~40 erlauben)`);
  assert.equal(ok + limited, flood.length, 'unerwartete Statuscodes');

  const other = await get('/', { headers: { 'cf-connecting-ip': '198.51.100.20' } });
  assert.equal(other.status, 200, 'andere IP wird mitbestraft');

  await new Promise((r) => setTimeout(r, 4000));
  const later = await get('/', { headers: { 'cf-connecting-ip': '203.0.113.10' } });
  assert.equal(later.status, 200, 'IP erholt sich nicht');
});
