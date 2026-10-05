/**
 * Tiny i18n layer. Every module declares its own messages next to its code:
 *
 *   const t = createTranslator({
 *     de: { save: 'Speichern', count: '{n} Einträge' },
 *     en: { save: 'Save', count: '{n} entries' },
 *   });
 *   t('count', { n: 3 });
 *
 * German and English must define the same keys; TypeScript enforces this through `Messages`.
 */
export type Locale = 'de' | 'en';
export const LOCALES: readonly Locale[] = ['de', 'en'];

export type Messages<Keys extends string> = Record<Locale, Record<Keys, string>>;
export type Translator<Keys extends string> = (key: Keys, params?: Record<string, string | number>) => string;

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Picks the UI language from the trade site's host (de.pathofexile.com shows German). */
export function detectLocale(hostname: string): Locale {
  return hostname.startsWith('de.') ? 'de' : 'en';
}

export function createTranslator<Keys extends string>(messages: Messages<Keys>): Translator<Keys> {
  return (key, params) => {
    const template = messages[currentLocale][key] ?? messages.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}
