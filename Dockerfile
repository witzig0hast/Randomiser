# syntax=docker/dockerfile:1

# ---- Build: Tests laufen, dann wird das statische Bundle gebaut ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY scripts ./scripts
COPY src ./src
COPY test ./test
# Der Konfigurationstest gleicht die CSP in der Nginx-Konfiguration mit dem Quellcode ab.
COPY nginx/security-headers.conf ./nginx/security-headers.conf
RUN npm test && npm run build

# ---- Laufzeit: nur Nginx und statische Dateien, kein Node, keine Shell-Skripte beim Start ----
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# Direkter Start ohne Entrypoint-Skripte (die würden in /etc/nginx schreiben wollen; das Dateisystem ist read-only).
ENTRYPOINT ["nginx", "-g", "daemon off;"]
