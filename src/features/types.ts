import type { ComponentType } from 'preact';
import type { AppContext } from '../app/context';

/**
 * A feature is a self-contained module: its own folder under src/features/<id>/ with code,
 * styles, translations and tests. Register it in src/features/index.ts and nothing else changes.
 */
export interface Feature {
  /** Kebab-case id. Used for the settings switch, storage keys (`<id>:...`) and CSS hooks. */
  id: string;
  label: () => string;
  description: () => string;
  /** `false` means always on and not listed in settings. */
  toggleable: boolean;
  defaultEnabled: boolean;
  /** Styles injected while the feature runs. Scope them with `ptm-` prefixed classes. */
  css?: string;
  /** Adds a tab to the sidebar while the feature runs. The panel comes from `start`. */
  sidebarTab?: { label: () => string; icon: ComponentType; order: number };
  /** Called when the feature is switched on. Must undo everything in `dispose`. */
  start(ctx: AppContext): FeatureInstance | void | Promise<FeatureInstance | void>;
}

export interface FeatureInstance {
  dispose?(): void;
  /** Content of the sidebar tab, if `sidebarTab` is set. */
  Panel?: ComponentType;
}
