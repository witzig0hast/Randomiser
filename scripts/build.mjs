// Baut die statische Anwendung nach dist/: ein JS- und ein CSS-Bundle mit Inhalts-Hash im Namen
// (damit sie unbegrenzt gecacht werden können) plus eine passend verdrahtete index.html.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: { boot: 'src/js/boot.js', app: 'src/js/main.js', styles: 'src/styles/main.css' },
  outdir: 'dist/assets',
  entryNames: '[name]-[hash]',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2022', 'chrome111', 'firefox120', 'safari16.4'],
  legalComments: 'none',
  metafile: true,
  logLevel: 'info',
});

const fileFor = (entry) => {
  const hit = Object.entries(result.metafile.outputs).find(([, meta]) => meta.entryPoint === entry);
  if (!hit) throw new Error(`Kein Build-Ergebnis für ${entry}`);
  return `/${hit[0].replace(/^dist\//, '')}`;
};

const html = (await readFile(resolve(root, 'src/index.html'), 'utf8'))
  .replaceAll('%BOOT%', fileFor('src/js/boot.js'))
  .replaceAll('%APP%', fileFor('src/js/main.js'))
  .replaceAll('%CSS%', fileFor('src/styles/main.css'));

await writeFile(resolve(dist, 'index.html'), html);
await cp(resolve(root, 'src/static'), dist, { recursive: true });
console.log('dist/ bereit');
