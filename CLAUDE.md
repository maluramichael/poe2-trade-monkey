# PoE2 Trade Monkey

Userscript (Violentmonkey/Tampermonkey/Greasemonkey 4) für `https://*.pathofexile.com/trade2*`.
Steckbrief und Scope: `PROJEKT.md`. Design-Vorgaben: `DESIGN.md`.

## Befehle

```bash
npm run check        # typecheck + unit tests + build (vor jedem Commit)
npm test             # Vitest + happy-dom
npm run build        # dist/poe2-trade-monkey.user.js + .meta.js
npm run dev          # esbuild watch
npm run test:e2e     # Playwright gegen Fixtures (offline)
```

## Architektur

- `src/main.tsx` bootet: Page-Bridge injizieren (document-start), auf die Vue-App warten,
  Settings laden, Features über den `FeatureHost` starten, Sidebar rendern.
- `src/site/page/` läuft **im Seitenkontext** (eigenes esbuild-Bundle, als String eingebettet).
  Hookt XHR (Suche) und fetch (Listings) der Seite und führt Vuex-Commits aus. Kein GM-API dort.
- `src/site/bridge/` Protokoll und Client. Nachrichten sind JSON-Strings in `CustomEvent.detail`
  (überlebt Firefox-Xrays in allen Managern).
- `src/site/selectors.ts` ist die **einzige** Stelle für Selektoren der Trade-Seite.
- `src/features/<id>/` je Feature ein Ordner mit `index.ts(x)` (exportiert ein `Feature`),
  eigenen Texten (`createTranslator`), eigenem CSS und Tests. Registrieren in
  `src/features/index.ts`. Ein Feature räumt in `dispose()` alles wieder ab.
- `src/ui/` gemeinsame Hülle und UI-Kit (Button, Modal, Menu, Form, Icons). Neue Bausteine dort,
  nicht im Feature duplizieren.

## Fakten zur Trade-Seite (verifiziert 2026-10-05)

- Suchformular: Vue 2.6 + Vuex unter `#trade`, global als `window.app`. Ergebnisliste: Vue-3-App
  in `#vue3-portal`. Snapshots in `docs/dom/`.
- Vuex-Module sind **nicht** namespaced: `commit('setStatFilter', {group, value: {id, value: {min}}})`,
  `commit('pushStatGroup', {type: 'not', filters: []})`,
  `commit('setPropertyFilter', {group: 'misc_filters', index: 'corrupted', value: {option: 'false'}})`
  (leerer `value` löscht), `commit('setFilterGroupDisabled', {type: 'filters', group, disable})`,
  `commit('setItem', {name, type, disc, term})`. Live verifiziert, das Formular zieht sofort nach.
  Quelltext (Pfadpräfix dort ist nur das Modul, nicht Teil des Namens): `docs/dom/vuex-mutations.txt`.
- Suche = XHR `POST /api/trade2/search/poe2/{league}`, Listings = fetch `GET /api/trade2/fetch/...`.
- Such-IDs sind gzip+base64url der Query (`H4sI...`) und league-unabhängig. `?q=<json>` lässt die
  Seite eine Query selbst ausführen.
- Ergebnis-Mods: `.item-mod--explicit > [data-field="stat.explicit.stat_N"]`.
- Seite hat keine CSP. Login und Cloudflare blocken automatisierte Browser.

## Offline testen (Standard)

```bash
npm run build && npm run test:e2e                         # 7 Flows gegen die nachgebaute Seite
npm run build && PTM_SCREENS=1 npx playwright test e2e/screens.spec.ts
```

`e2e/fake-site.ts` baut die trade2-Seite aus den Fixtures nach (Fake-Vuex, echte API-Antworten).
Die Screenshot-Spec lädt zusätzlich das echte Seiten-CSS vom CDN (web.poecdn.com, ohne Login und
ohne Cloudflare) und legt Bilder unter `~/.claude/screenshots/pathofexile2trademonkey/offline/` ab.
Design und Abläufe zuerst hier prüfen.

## Live testen (sparsam)

Zu viele Reloads in kurzer Zeit lösen eine Cloudflare-Prüfung aus, die immer länger dauert.
Live nur gebündelt mit Checkliste, höchstens etwa 10 Seitenladungen pro Sitzung.

Echtes Chrome mit eigenem Profil (Login bleibt erhalten), Playwright hängt sich per CDP an:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$HOME/.playwright-mcp-profiles/poe2trade" --remote-debugging-port=9333 \
  "https://www.pathofexile.com/trade2/search/poe2/Standard" &
playwright-cli -s=poe attach --cdp=http://127.0.0.1:9333
npm run build && node e2e/live-inject.mjs > /tmp/inject.js && playwright-cli -s=poe run-code --filename=/tmp/inject.js
```

Screenshots nach `~/.claude/screenshots/pathofexile2trademonkey/`. Rohe Fixtures mit
Account-Namen liegen in `e2e/fixtures/raw/` (gitignored), nie committen.

## Regeln

- GGG-Grenzen: keine automatischen Suchen, kein Polling der Trade-API, nie Whisper oder
  „Travel to Hideout“ automatisch auslösen. Nur Daten nutzen, die die Seite selbst lädt.
- Jeder sichtbare Text läuft durch `createTranslator` (de und en). Deutsch mit echten Umlauten,
  „du“, keine Em-Dashes.
- `@version` in `package.json` vor jedem Push mit Nutzer-Änderungen erhöhen, sonst kommt kein
  Auto-Update. `dist/` wird committed (Update-Quelle ist raw.githubusercontent.com).
- Push immer auf beide Remotes: `git push origin master && git push vault master`.
- `.githooks/pre-push` stoppt den Push, wenn `npm run check` scheitert, `dist/` nicht zum frischen
  Build passt oder sich das Userscript ohne neue Version geändert hat. Pro Klon einmal aktivieren:
  `git config core.hooksPath .githooks`. Ein Push auf master synct per Webhook sofort Greasy Fork.
- npm-Pakete nur mit festen Versionen und `--ignore-scripts`, vorher auf Supply-Chain-Vorfälle prüfen.
