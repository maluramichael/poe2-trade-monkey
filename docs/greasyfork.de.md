<!-- Zusätzliche Infos auf Greasy Fork (Deutsch), werden aus dieser Datei gesynct. Bilder als absolute https-URLs. -->
Bringt die Funktionen der beliebten Chrome-Erweiterungen (Better Trading, TradeUX) auf die [Trade-Seite von Path of Exile 2](https://de.pathofexile.com/trade2), in jedem Browser, Firefox zuerst. Gemacht für Violentmonkey, Tampermonkey und Greasemonkey 4 sollten auch gehen.

![Die Trade-Seite mit Schnellfiltern und der Lesezeichen-Leiste](https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/docs/screenshots/overview.png)

## Funktionen

Jede Funktion lässt sich in den Einstellungen abschalten.

**Lesezeichen, die jeden Ligawechsel überstehen**
- Ordner mit Währungs- oder Aszendenz-Icons, sortieren per Drag and Drop, Archiv.
- Suchen öffnen sich in der Liga, die du gerade spielst. Deine Ordner funktionieren also in jeder neuen Liga wieder.
- „In aktueller Liga prüfen“ warnt, wenn eine gespeicherte Suche Stats nutzt, die es nicht mehr gibt.
- Ordner als Code teilen, Codes und Backups aus Better Trading importieren.

![Lesezeichen-Menü](https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/docs/screenshots/bookmark-menu.png)

**Verlauf und Pins**
- Die letzten 50 Suchen, wieder öffnen in ihrer Liga oder in der aktuellen.
- Ergebnisse anpinnen und vergleichen, ein Klick bringt dich zurück zu ihrer Suche.
- Der Browser-Tab zeigt den Namen des Lesezeichens oder das gesuchte Item.

![Ein angepinntes Item neben der Ergebnisliste](https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/docs/screenshots/pins.png)

**Ergebnisse**
- Mods, nach denen du filterst, werden hervorgehoben.
- „+“ und „−“ an jeder Mod übernehmen sie als Filter oder schließen sie aus.
- Gleiche Angebote vom selben Verkäufer zum selben Preis werden zusammengefasst.
- Gegenwert in Divine und Exalted Orbs nach poe.ninja.

**Suchformular**
- Zwei Spalten: Filter links, Ergebnisse rechts, die Such-Knöpfe bleiben unten.
- Schnellfilter: verderbt, brüchig, entweiht, Gegenstandsstufe, Qualität, Seltenheit und mehr.
- Immer unscharf suchen: Die Suchfelder für Items und Stats beginnen mit ~.
- Stats mit Stern bleiben oben in der Stat-Auswahl.

![Schnellfilter über Suchen und Leeren](https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/docs/screenshots/quick-filters.png)

## Fair zur Trade-Seite

Das Skript erweitert nur, was die Seite sowieso lädt. Es schickt keine eigenen Suchen ab, fragt die Trade-API nicht im Hintergrund ab und klickt nie für dich auf Flüstern oder „Travel to Hideout“.

Code, Fehlermeldungen und Änderungen: [GitHub](https://github.com/maluramichael/poe2-trade-monkey). Wie es entstanden ist: [Blogartikel](https://malura.de/blog/poe2-trade-monkey). Ebenfalls von mir: der [PoE2-Speedrun-Guide für die Kampagne](https://poe2speedrun.malura.de/).

Dieses Produkt steht in keiner Verbindung zu Grinding Gear Games und wird nicht von Grinding Gear Games unterstützt.
