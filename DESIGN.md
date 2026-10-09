# Design

Vorbild ist Better Trading (MIT). Die Farben stammen direkt von der Trade-Seite (live
ausgelesen am 2026-10-05), deshalb wirkt die Seitenleiste wie ein Teil der Seite.

## Schrift

| Zweck | Wert |
|---|---|
| Titel, Buttons, Tabs, Ordner, Lesezeichen | `FontinSmallCaps, Verdana, Arial, sans-serif` (lädt die Seite selbst) |
| Fließtext, Menüs, Zahlen | `Verdana, Arial, Helvetica, sans-serif` |
| Größen | Panel-Titel 20 px, Ordner 15 px, Buttons 13 px, Text 13 px, Meta 11 px |

Keine eigenen Fonts bündeln. Icons als Inline-SVG (Font-Awesome-Formen nachgebaut, MIT-freie
Pfade), keine Icon-Fonts.

## Farben (CSS-Variablen unter `#ptm-root`)

| Token | Wert | Verwendung |
|---|---|---|
| `--ptm-bg` | `rgba(10,10,10,.85)` | Seitenleiste |
| `--ptm-surface` | `#161616` | Listen, Popover |
| `--ptm-input` | `#1e2124` | Eingabefelder |
| `--ptm-blue` / `--ptm-blue-hover` | `#0f304d` / `#133d62` | Ordner-Kopf, blaue Buttons, Ausklapp-Lasche |
| `--ptm-blue-border` | `#4c4c7d` | Ordner-Rahmen, Trennlinien (40 % Alpha in Listen) |
| `--ptm-gold` / `--ptm-gold-hover` | `#5a3806` / `#724708` | Goldene Buttons („Aktuelle Suche speichern“) |
| `--ptm-gold-border` | `#8a5609` | Gold-Rahmen, aktiver Tab, Hover-Verlauf, Mod-Highlight (25 %) |
| `--ptm-red` / `--ptm-red-border` | `#5a0a09` / `#6d2725` | Löschen |
| `--ptm-green` / `--ptm-green-border` | `#4b7e42` / `#5e9954` | Erfolg |
| `--ptm-yellow` / `--ptm-yellow-border` | `#666521` / `#7a7921` | Warnung |
| `--ptm-text` | `#ffffff` | Text in Buttons und Köpfen |
| `--ptm-beige` | `#fff8e1` | Labels |
| `--ptm-muted` | `#a38d6d` | Meta-Text (Seitenfarbe für Fließtext) |
| `--ptm-menu` / `--ptm-menu-border` | `#373737` / `#7a7a7a` | Kontextmenü |
| `--ptm-focus` | `#c59a50` | Fokus-Rahmen (2 px, alle interaktiven Elemente) |

Seltenheiten: normal `#c8c8c8`, magic `#8888ff`, rare `#ffff77`, unique `#af6025`.

## Bausteine

- **Button:** Höhe 32 px, Padding `0 10px`, 1 px Rahmen in der `-border`-Farbe, Fontin 13 px,
  weiße Schrift, Hover hellt um ca. 5 % auf (`--*-hover`), Übergang 0,2 s. Varianten blau, gold,
  rot. Keine Verläufe auf Buttons.
- **Seitenleiste:** fest rechts, 400 px breit, `z-index: 1000`, Padding `5px 10px`. Die Seite
  bekommt `padding-right: 400px`, eingeklappt 0. Ausklapp-Lasche oben rechts in Blau mit Logo. Unter 1000 px
  Fensterbreite liegt sie über der Seite statt sie zu schieben.
- **Kopf:** Einklapp-Knopf, Logo und „PoE2 Trade Monkey“ in Fontin 20 px, rechts Einstellungen.
- **Tabs:** Lesezeichen, Verlauf, Pins. Je gleich breit, 2 px Unterstrich, aktiv in
  `--ptm-gold-border`, Hover-Hintergrund Gold mit 20 % Alpha.
- **Ordner:** Rahmen `--ptm-blue-border`, Kopf `--ptm-blue` mit Icon, Titel (Ellipsis),
  Chevron, „…“-Menü und Zieh-Griff. Einträge Fontin, Padding `6px 7px`, Trennlinie
  `rgba(76,76,125,.4)`, Hover = Verlauf von links `rgba(138,86,9,.4)` nach transparent.
  Unten im offenen Ordner der volle goldene Button „Aktuelle Suche speichern“.
- **Kontextmenü:** 200 px, `--ptm-menu`, Rahmen `--ptm-menu-border`, Verdana 13 px,
  Einträge `4px 8px`.
- **Modal:** 650 px, `rgba(20,20,20,.9)`, Overlay `rgba(0,0,0,.6)`, Kopf mit Logo und Titel in
  Fontin 15 px Großbuchstaben, schließt mit Esc und Klick aufs Overlay. Startfokus im Dialog, Fokus kehrt beim
  Schließen zurück.
- **Toast:** unten rechts, 4,5 s, Klick schließt, Varianten Erfolg, Warnung, Fehler.
- **Formulare:** Label Fontin 15 px beige, Input 30 px hoch `--ptm-input` ohne Rahmen,
  Checkbox 15 px Quadrat mit 2 px Rahmen `#8a6a3a`.

## Ergebnis-Markierungen

- Hervorgehobene Mods: Hintergrund `rgba(138,86,9,.25)`.
- Angepinnte Zeile: `box-shadow: inset 0 0 10px 2px #4c4c7d`.
- „+“/„−“ an Mods: 20 × 20 px, erscheinen beim Hover über die Mod-Zeile.
- Preisäquivalent: eine Zeile unter dem Preis, `--ptm-muted`, Fontin 13 px.

Alle eigenen Klassen und IDs beginnen mit `ptm-`.
