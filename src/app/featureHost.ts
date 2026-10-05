import type { ComponentType } from 'preact';
import { log } from '../core/log';
import { Store } from '../core/store';
import type { Feature, FeatureInstance } from '../features/types';
import type { AppContext } from './context';
import { isFeatureEnabled } from './settings';

export interface RunningFeature {
  feature: Feature;
  Panel?: ComponentType;
}

/**
 * Starts and stops features according to the settings. Switching a feature off in the settings
 * disposes it immediately, switching it on starts it, no reload needed.
 */
export class FeatureHost {
  readonly running = new Store<RunningFeature[]>([]);
  readonly #instances = new Map<string, { instance: FeatureInstance | void; style?: HTMLStyleElement }>();
  readonly #starting = new Set<string>();

  constructor(
    readonly features: readonly Feature[],
    private readonly ctx: AppContext,
  ) {}

  start(): () => void {
    const sync = () => {
      for (const feature of this.features) {
        const enabled = !feature.toggleable || isFeatureEnabled(this.ctx.settings.get(), feature.id, feature.defaultEnabled);
        const running = this.#instances.has(feature.id) || this.#starting.has(feature.id);
        if (enabled && !running) void this.#startFeature(feature);
        if (!enabled && running) this.#stopFeature(feature);
      }
    };
    sync();
    const off = this.ctx.settings.subscribe(sync);
    return () => {
      off();
      for (const feature of this.features) this.#stopFeature(feature);
    };
  }

  /**
   * Stops and starts every running feature again, e.g. after a language switch: features that
   * render into the trade page resolve their texts when they start.
   */
  async restart(): Promise<void> {
    const running = this.features.filter((feature) => this.#instances.has(feature.id));
    for (const feature of running) this.#stopFeature(feature);
    await Promise.all(running.map((feature) => this.#startFeature(feature)));
  }

  async #startFeature(feature: Feature): Promise<void> {
    this.#starting.add(feature.id);
    let style: HTMLStyleElement | undefined;
    try {
      if (feature.css) {
        style = this.ctx.doc.createElement('style');
        style.dataset.ptmFeature = feature.id;
        style.textContent = feature.css;
        this.ctx.doc.head.append(style);
      }
      const instance = await feature.start(this.ctx);
      this.#instances.set(feature.id, { instance, style });
      this.#publish();
    } catch (error) {
      style?.remove();
      log.error(`feature "${feature.id}" failed to start`, error);
    } finally {
      this.#starting.delete(feature.id);
    }
  }

  #stopFeature(feature: Feature): void {
    const entry = this.#instances.get(feature.id);
    if (!entry) return;
    this.#instances.delete(feature.id);
    try {
      entry.instance?.dispose?.();
    } catch (error) {
      log.error(`feature "${feature.id}" failed to stop`, error);
    }
    entry.style?.remove();
    this.#publish();
  }

  #publish(): void {
    this.running.set(
      this.features
        .filter((feature) => this.#instances.has(feature.id))
        .map((feature) => ({ feature, Panel: this.#instances.get(feature.id)?.instance?.Panel })),
    );
  }
}
