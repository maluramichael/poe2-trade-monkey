import { persistedStore, type KeyValueStorage } from '../core/storage';
import type { Store } from '../core/store';

export type LanguageSetting = 'auto' | 'de' | 'en';

export interface Settings {
  /** Feature switches by feature id. Missing entries fall back to the feature's default. */
  features: Record<string, boolean>;
  sidebarCollapsed: boolean;
  /** Id of the open sidebar tab. */
  activeTab: string | null;
  language: LanguageSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  features: {},
  sidebarCollapsed: false,
  activeTab: null,
  language: 'auto',
};

export function loadSettings(storage: KeyValueStorage): Promise<Store<Settings>> {
  return persistedStore<Settings>(storage, 'settings', {
    schema: 1,
    defaultValue: DEFAULT_SETTINGS,
  });
}

export function isFeatureEnabled(settings: Settings, id: string, defaultEnabled: boolean): boolean {
  return settings.features[id] ?? defaultEnabled;
}
