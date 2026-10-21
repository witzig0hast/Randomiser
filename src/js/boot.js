// Läuft blockierend im <head>, damit das gespeicherte Farbschema ohne Aufblitzen greift.
try {
  const theme = JSON.parse(localStorage.getItem('rnd:theme'));
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
} catch {
  /* ohne Persistenz gilt die Systemeinstellung */
}
