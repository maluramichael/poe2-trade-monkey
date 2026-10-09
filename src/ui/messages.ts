import { createTranslator } from '../core/i18n';
import { UNKNOWN_MUTATION } from '../site/bridge/protocol';

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
    siteChanged: 'Die Trade-Seite hat sich geändert, diese Aktion klappt gerade nicht. Ein Update von Trade Monkey behebt das meist.',
    actionFailed: 'Das hat nicht geklappt. Details stehen in der Browser-Konsole.',
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
    siteChanged: 'The trade site has changed, this action does not work right now. A Trade Monkey update usually fixes it.',
    actionFailed: 'That did not work. Details are in the browser console.',
  },
});

/** User-facing text for a failed action; a rejected mutation name means the site changed. */
export function errorText(error: unknown): string {
  return String(error instanceof Error ? error.message : error).startsWith(UNKNOWN_MUTATION) ? t('siteChanged') : t('actionFailed');
}
