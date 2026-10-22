import { chromium } from 'playwright';

export const BASE = (process.env.BASE_URL ?? 'http://app:8080').replace(/\/$/, '');
const INSECURE_TEST_ORIGIN = /^http:\/\/(?!localhost|127\.0\.0\.1)/.test(BASE);

/** Startet Chromium; optional mit eigenem Browser-Pfad (z. B. außerhalb des Playwright-Images). */
export function launch() {
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

/** Neue Seite, die Konsolenfehler, Skriptfehler, CSP-Verstöße und fehlgeschlagene Requests sammelt. */
export async function openPage(browser, options = {}) {
  const context = await browser.newContext({ locale: 'de-DE', reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Chrome ignoriert COOP auf unverschlüsseltem HTTP (Test-Netz: http://app:8080). In Produktion liefert Cloudflare per HTTPS aus.
    if (INSECURE_TEST_ORIGIN && m.text().startsWith('The Cross-Origin-Opener-Policy header has been ignored')) return;
    problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  return { page, problems, close: () => context.close() };
}

/** Hauptaktion eines Werkzeugs (dieselbe, die auch die Leertaste auslöst). */
export const mainAction = (page) => page.locator('.stage [data-shortcut], .stage .btn-primary').first();

/** Wartet, bis keine Aktion mehr läuft (Animation beendet). */
export const idle = (page) => page.waitForFunction(() => !document.querySelector('.stage [aria-busy="true"]'), null, { timeout: 15000 });

/** Löst die Hauptaktion aus und wartet auf das Ende der Animation. */
export async function act(page) {
  await mainAction(page).click();
  await idle(page);
}
