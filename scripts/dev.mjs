// Entwicklungsmodus: baut bei jeder Änderung neu und serviert dist/ mit den Produktions-Headern.
process.argv.push('--watch');
await import('./build.mjs');
await import('./serve.mjs');
