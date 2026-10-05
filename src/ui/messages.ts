import { createTranslator } from '../core/i18n';

/** Strings of the shared UI shell. Features keep their own messages next to their code. */
export const t = createTranslator({
  de: {
    appName: 'PoE2 Trade Monkey',
    collapse: 'Seitenleiste einklappen',
    expand: 'Seitenleiste öffnen',
    settings: 'Einstellungen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    close: 'Schließen',
    language: 'Sprache',
    languageAuto: 'Wie die Trade-Seite',
    features: 'Funktionen',
    version: 'Version {version}',
    disclaimer: 'Dieses Projekt steht in keiner Verbindung zu Grinding Gear Games und wird nicht von ihnen unterstützt.',
    noTabs: 'Alle Seitenleisten-Funktionen sind ausgeschaltet. Schalte sie in den Einstellungen ein.',
    sourceCode: 'Quellcode auf GitHub',
  },
  en: {
    appName: 'PoE2 Trade Monkey',
    collapse: 'Collapse sidebar',
    expand: 'Open sidebar',
    settings: 'Settings',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    language: 'Language',
    languageAuto: 'Same as the trade site',
    features: 'Features',
    version: 'Version {version}',
    disclaimer: "This product isn't affiliated with or endorsed by Grinding Gear Games in any way.",
    noTabs: 'All sidebar features are switched off. Turn them on in the settings.',
    sourceCode: 'Source code on GitHub',
  },
});
