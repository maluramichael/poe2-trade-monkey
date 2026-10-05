# PoE2 Trade Monkey

Userscript für Violentmonkey, Tampermonkey und Greasemonkey, das die Trade-Seite von Path of
Exile 2 (`https://*.pathofexile.com/trade2*`) erweitert. Ziel: alles, was Better Trading, TradeUX
und Co. als Chrome-Extension können, in Firefox per Userscript.

## Steckbrief

| Thema | Entscheidung |
|---|---|
| Artefakt | Ein Userscript (`poe2-trade-monkey.user.js`), keine Landingpage |
| Ambition | klein-public: öffentliches GitHub-Repo, kein Marketing |
| Name | `poe2-trade-monkey`, Anzeigename „PoE2 Trade Monkey“ |
| Zielbrowser | Firefox (Prüfbrowser), Chrome nur als Werkzeug für Live-Tests |
| Manager | Violentmonkey primär, Tampermonkey und Greasemonkey 4 kompatibel |
| Scope v1 | „Alles“ (siehe unten), Preset-Datenbanken ins Backlog |
| Updates | `@updateURL`/`@downloadURL` auf `raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/dist/…` |
| Remotes | `origin` = GitHub, `vault` = `git@vault:maluramichael/poe2-trade-monkey.git`, jeder Push auf beide |
| UI-Sprache | Deutsch und Englisch, folgt der Sprache der Trade-Seite (`de.pathofexile.com` → de) |
| Design | Better-Trading-Optik (siehe `DESIGN.md`) |

### Namensprüfung

GitHub und Greasyfork: keine Kollision mit „poe2 trade monkey“ (geprüft 2026-10-05). Kein
Store-Release, daher keine Marken- oder Instagram-Prüfung. „Path of Exile“ ist eine Marke von
Grinding Gear Games, deshalb im Skript und README der Hinweis „This product isn't affiliated with
or endorsed by Grinding Gear Games in any way.“

## Scope v1

### Lesezeichen (Better-Trading-Parität)
- Ordner mit Titel, Icon (Currency und Ascendancy, Icons aus Better Trading, MIT), Archiv,
  Drag-Sortierung von Ordnern und Suchen, Ein- und Ausklappen, „Alle einklappen“.
- „Aktuelle Suche speichern“ je Ordner, Titelvorschlag aus Suchfeld, Kategorie und Seltenheit.
- Pro Suche: öffnen (normaler Link, Mittelklick geht), Live-Suche öffnen, URL kopieren,
  mit aktueller Suche überschreiben, erledigt markieren, umbenennen, löschen.
- **League-unabhängig:** Gespeichert wird `{typ, suchId, query, sort, league beim Speichern}`.
  Geöffnet wird immer in der aktuell gewählten League. Die trade2-Such-ID ist die
  gzip-komprimierte Query selbst und enthält keine League (verifiziert). Fallback, falls GGG das
  Format ändert: `?q=`-URL aus der gespeicherten Query.
- Badge, wenn eine Suche unter einer anderen League gespeichert wurde.
- Prüfung „passt die Suche noch in diese League?“: Stat-IDs gegen `/api/trade2/data/stats`
  abgleichen und unbekannte markieren.
- Import und Export: Ordner-Code, Backup-Datei, **kompatibel zum Better-Trading-Format** (`3:`
  + Base64-JSON), damit Umsteiger ihre Lesezeichen mitnehmen.

### Verlauf, Pins, Tab-Titel
- Suchverlauf (max. 50, Duplikate in Folge übersprungen), Link mit gespeicherter League und
  „in aktueller League öffnen“.
- Ergebnisse anpinnen, Pins-Tab mit geklonter Item-Karte, zum Ergebnis scrollen.
- Tab-Titel = Name des Lesezeichens oder Suchbeschreibung, ⚡ bei Live-Suche.

### Ergebnis-Verbesserungen (einzeln abschaltbar)
- Gesuchte Mods in Ergebnissen hervorheben.
- Gleiche Angebote (Verkäufer + Item + Preis) zusammenfassen, „N ähnliche“ aufklappbar.
- Preisäquivalent in Divine und Exalted über poe.ninja (Cache 1 h pro League).
- „+“ und „−“ an jeder Mod im Ergebnis: Mod als Filter hinzufügen bzw. in eine NOT-Gruppe.
- Automatisch „Mehr laden“ beim Scrollen.

### Filter-Panel und Layout (einzeln abschaltbar)
- Zwei-Spalten-Layout (Filter links, Ergebnisse rechts), volle Breite, Hintergrund aus.
- Sticky Suchpanel mit fester Such-Leiste unten.
- Quick-Filter-Leiste: Corrupted, Fractured, Desecrated, Mirrored, Sanctified als Dreistufen-Knopf
  (egal, ja, nein), Level/Attribute max, Item-Level min, Qualität, Sockel, Seltenheit.
- Stat-Favoriten (Stern an Stat-Optionen, Favoriten oben).
- Löschen-Knopf im Item-Suchfeld.

### Einstellungen
- Einstellungs-Dialog mit allen Schaltern, Version, GGG-Hinweis.
- Seitenleiste ein- und ausklappbar, Breite fest 400 px, schiebt die Seite (`padding-right`),
  statt sie zu überdecken (Fehler in Better Trading seit PoE2 0.5).

## Backlog (bewusst nicht in v1)
- Preset-Browser für Gems, Uniques, Gear, Waystones, Tablets (TradeUX): braucht eigene
  Datenbasis, bricht pro Patch.
- Mehrere Live-Suchen in einem Tab mit eigenen WebSockets, Ton und Desktop-Benachrichtigung.
- Verkäufer-Gruppierung, Bulk-Sicht, Preis-Köder-Erkennung.
- Tier-Auswahl in Stat-Filtern, Roll-Qualität in Prozent.
- Angebots-Gedächtnis (neu, gesehen, Preisänderung seit letztem Besuch).
- Sync über mehrere Rechner (Gist oder WebDAV).
- Upgrade-Vergleich mit dem eigenen Item.

## Harte Grenzen (GGG-Regeln)
- Keine automatischen Suchen, kein Polling, keine Hintergrund-Requests gegen die Trade-API, die
  der Nutzer nicht ausgelöst hat. Daten kommen aus dem, was die Seite ohnehin lädt.
- Nie automatisch „Travel to Hideout“ oder Whisper klicken. Eine Aktion pro Nutzereingabe.
- Fremd-APIs (poe.ninja) nur gecacht und über `GM.xmlHttpRequest`.

## Nicht gefragt, weil gesetzt
Default-Branch `master`, Push auf beide Remotes, Test-Stack Unit und E2E, Deutsch mit echten
Umlauten, keine Em-Dashes (siehe project-starter Teil A).
