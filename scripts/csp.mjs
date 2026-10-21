/**
 * Content-Security-Policy der Anwendung. Muss mit nginx/nginx.conf übereinstimmen
 * (wird in test/config.test.js geprüft).
 * Es gibt weder Inline-Skripte noch Inline-Styles und keine externen Ressourcen.
 */
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');
