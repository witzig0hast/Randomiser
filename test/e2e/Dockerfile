# Test-Container: Node + Chromium (offizielles Playwright-Image, Version passend zu package.json).
FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /e2e/test/e2e
COPY test/e2e/package.json test/e2e/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
# Die CSP wird gegen dieselbe Quelle geprüft, aus der auch die Anwendung stammt.
COPY scripts/csp.mjs /e2e/scripts/csp.mjs
COPY test/e2e/*.e2e.mjs test/e2e/helpers.mjs ./
USER pwuser
CMD ["npm", "test"]
