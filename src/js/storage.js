/** Schmale localStorage-Hülle. Schlägt der Zugriff fehl (Privatmodus o. Ä.), läuft die App ohne Persistenz weiter. */
const PREFIX = 'rnd:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Persistenz ist optional */
  }
}
