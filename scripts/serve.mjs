// Kleiner lokaler Server für dist/ mit denselben Sicherheits-Headern wie in Produktion. Nur für die Entwicklung.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSP } from './csp.mjs';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT ?? 8080);
// Im Dev-Container muss auf allen Schnittstellen gelauscht werden; lokal reicht 127.0.0.1.
const host = process.env.HOST ?? '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = join(dist, path === '/' || path.endsWith('/') ? `${path}index.html` : path);
  const headers = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
  try {
    if (!file.startsWith(dist)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(dist, 'index.html'));
    res.writeHead(404, { ...headers, 'Content-Type': types['.html'] });
    res.end(body);
  }
}).listen(port, host, () => console.log(`Dev-Server: http://${host}:${port}`));
