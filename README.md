# Randomiser

Zufallsplattform mit 22 Werkzeugen: Ja/Nein, Münzwurf, Würfel, Glücksrad, Zufallszahlen, Teams auslosen, Passwörter und mehr.
Läuft als einzelner Docker-Container hinter Nginx Proxy Manager und Cloudflare.

**Kernidee:** Die Plattform ist eine rein statische Seite. Alle Zufallswerte entstehen im Browser der Nutzenden
(Web Crypto, kryptografisch sicher). Es gibt keinen Anwendungsserver, keine Datenbank und keine API.
Damit sind beliebig viele gleichzeitige Nutzer kein Problem. Der Container liefert nur Dateien aus und verbraucht im
Leerlauf rund 5 MiB RAM und keine CPU. Eingaben und Ergebnisse verlassen das Gerät nie.

## Werkzeuge

| Kategorie | Werkzeuge |
|---|---|
| Entscheiden | Ja/Nein (mit einstellbarer Chance), Münzwurf (3D), Zufallsauswahl aus Liste, Glücksrad, Magic 8-Ball, Schere-Stein-Papier |
| Zahlen & Würfel | Zufallszahl (Ganz-/Dezimalzahl, ohne Wiederholung), Würfel W4–W100 mit Modifikator, Lottozahlen (6 aus 49, Eurojackpot, eigene), Zufallsprozent |
| Gruppen & Spiele | Teams auslosen, Reihenfolge, Karten ziehen (52/32/54), Flaschendrehen |
| Text & Daten | Passwort-Generator, Zufallsbuchstabe, Zufallsfarben, Zufallsdatum/-uhrzeit, UUID-Generator |
| Spaß | Wahrheit oder Pflicht, Was essen wir?, Was unternehmen wir? |

Die Sprache folgt dem Browser (Deutsch oder Englisch) und lässt sich oben rechts umschalten. Das Farbschema folgt dem Gerät (hell/dunkel) und ist ebenfalls umschaltbar.

## Betrieb

```bash
cp .env.example .env      # Port und Bind-Adresse bei Bedarf anpassen
docker compose up -d --build
```

Der Container lauscht auf dem Host standardmäßig auf Port **63871** (bewusst hoch und unüblich, über `HOST_PORT` änderbar).

### Nginx Proxy Manager

Neuer Proxy Host:

| Feld | Wert |
|---|---|
| Domain Names | deine Domain |
| Scheme | `http` |
| Forward Hostname / IP | IP des Docker-Hosts |
| Forward Port | `63871` |
| Block Common Exploits | an |
| SSL | Zertifikat anfordern, *Force SSL* an, *HTTP/2* an |

Websockets werden nicht benötigt. HSTS am besten hier oder in Cloudflare aktivieren.

### Cloudflare

* SSL/TLS-Modus **Full (strict)**.
* Die Dateien unter `/assets/` tragen einen Inhalts-Hash und sind mit `immutable` ein Jahr cachebar. Cloudflare liefert sie aus
  dem Cache aus, sodass kaum Anfragen beim Server ankommen.
* Optional: eine WAF-Rate-Limiting-Regel direkt in Cloudflare, damit Floods den Server gar nicht erreichen.
* **Rocket Loader, Automatic Platform Optimization und die automatische Web-Analytics-Einbindung ausgeschaltet lassen.**
  Diese Funktionen schreiben Skripte in die Seite um oder fügen fremde ein. Die strikte Content-Security-Policy blockiert das,
  bei Rocket Loader startet die App dann gar nicht. „Auto Minify“ ist unnötig, die Dateien sind bereits minifiziert.

### Direktzugriff auf den Port verhindern

Der Port umgeht Cloudflare, wenn er aus dem Internet erreichbar ist. Entweder in der Firewall nur die Adresse des Nginx Proxy Managers
zulassen, oder in `.env` `BIND_ADDRESS=127.0.0.1` setzen, wenn der Proxy direkt auf dem Host läuft.

## Schutz vor Anfrageflut

Das Limit liegt in `nginx/nginx.conf` und gilt pro Client-IP:

* 10 Requests/Sekunde mit Burst 40, danach `429 Too Many Requests`. Eine Seitenladung braucht etwa 4 Requests.
* Höchstens 30 gleichzeitige Verbindungen pro IP, kurze Timeouts (5 s für Header und Body), keine Request-Bodies.
* Nur `GET` und `HEAD` sind erlaubt, alles andere wird mit `405` beantwortet.

Die Client-IP stammt aus `CF-Connecting-IP`. Dem Header wird nur von privaten Adressen vertraut (Docker- oder LAN-Netz).
**Wichtig:** Läuft der Nginx Proxy Manager auf einem anderen Server mit öffentlicher IP, muss diese in `nginx/nginx.conf` als
`set_real_ip_from` ergänzt werden. Sonst teilen sich alle Nutzer ein gemeinsames Limit.

## Sicherheit

* **Container:** Dateisystem read-only, `cap_drop: ALL`, `no-new-privileges`, läuft als unprivilegierter Benutzer, 64 MB RAM, 0,5 CPU, 64 Prozesse. Kein Node.js im Laufzeit-Image.
* **Content-Security-Policy:** `default-src 'none'`, nur eigene Skripte und Styles, keine Inline-Skripte, keine externen Ressourcen, keine Schriften oder Tracker von Dritten.
* **Weitere Header:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP und CORP.
* **Kein `innerHTML`:** Die Oberfläche wird ausschließlich über DOM-APIs gebaut, eingegebene Listen können also kein Markup einschleusen. Ein Test stellt das sicher.
* **Zufall:** `crypto.getRandomValues` mit Rejection Sampling (kein Modulo-Bias), Fisher-Yates-Mischung, nie `Math.random`.
* **Passwörter** werden nur im Speicher erzeugt, nicht gespeichert und nicht protokolliert.

## Entwicklung

```bash
npm install
npm test          # Tests für Zufallskern, Farben, Konfiguration
npm start         # baut nach dist/ und serviert auf http://127.0.0.1:8080 (mit denselben Headern wie in Produktion)
```

Die Tests prüfen unter anderem die Gleichverteilung per Chi-Quadrat, Passwort-Eigenschaften, Würfelnotation und dass die CSP in Nginx
mit der des Quellcodes übereinstimmt.

### Neues Werkzeug hinzufügen

1. `src/js/tools/<id>.js` anlegen. Es exportiert `id`, `category`, `icon`, `messages` (Texte für `de` und `en`) und `mount(root, ctx)`.
2. In `src/js/tools/index.js` importieren und in `TOOLS` eintragen. Es erscheint automatisch auf der Startseite und in der Suche.

### Aufbau

```
src/index.html        Grundgerüst
src/styles/           Design-Tokens, Layout, Komponenten, Werkzeug-Styles
src/js/lib/           Zufallskern und Farbfunktionen (rein, getestet)
src/js/tools/         ein Modul pro Werkzeug, Texte liegen direkt daneben
src/js/               Router, i18n, Theme, UI-Bausteine
scripts/build.mjs     esbuild: je ein JS- und CSS-Bundle mit Hash im Dateinamen
nginx/                Konfiguration für Produktion
```
