import { MemoryStorage } from '../core/storage';
import { Store } from '../core/store';
import type { Feature } from '../features/types';
import type { AppContext } from './context';
import { FeatureHost } from './featureHost';
import { DEFAULT_SETTINGS, type Settings } from './settings';

function feature(id: string, log: string[], defaultEnabled = true): Feature {
  return {
    id,
    label: () => id,
    description: () => id,
    toggleable: true,
    defaultEnabled,
    css: `.ptm-${id} {}`,
    start: () => {
      log.push(`start ${id}`);
      return { dispose: () => log.push(`stop ${id}`) };
    },
  };
}

describe('FeatureHost', () => {
  it('follows the settings switches and injects/removes feature css', async () => {
    const log: string[] = [];
    const settings = new Store<Settings>(DEFAULT_SETTINGS);
    const ctx = { doc: document, settings, storage: new MemoryStorage() } as unknown as AppContext;
    const host = new FeatureHost([feature('a', log), feature('b', log, false)], ctx);

    host.start();
    await Promise.resolve();
    expect(log).toEqual(['start a']);
    expect(document.querySelector('style[data-ptm-feature="a"]')).not.toBeNull();

    settings.set({ ...DEFAULT_SETTINGS, features: { a: false, b: true } });
    await Promise.resolve();
    expect(log).toEqual(['start a', 'stop a', 'start b']);
    expect(document.querySelector('style[data-ptm-feature="a"]')).toBeNull();
    expect(host.running.get().map((entry) => entry.feature.id)).toEqual(['b']);
  });

  it('restarts running features only', async () => {
    const log: string[] = [];
    const settings = new Store<Settings>(DEFAULT_SETTINGS);
    const ctx = { doc: document, settings, storage: new MemoryStorage() } as unknown as AppContext;
    const host = new FeatureHost([feature('a', log), feature('b', log, false)], ctx);
    host.start();
    await Promise.resolve();
    await host.restart();
    expect(log).toEqual(['start a', 'stop a', 'start a']);
  });

  it('startEarly starts only early features, start() adds the rest without doubling', async () => {
    const log: string[] = [];
    const settings = new Store<Settings>(DEFAULT_SETTINGS);
    const ctx = { doc: document, settings, storage: new MemoryStorage() } as unknown as AppContext;
    const host = new FeatureHost([feature('a', log), { ...feature('e', log), early: true }], ctx);
    host.startEarly();
    await Promise.resolve();
    expect(log).toEqual(['start e']);
    host.start();
    await Promise.resolve();
    expect(log).toEqual(['start e', 'start a']);
    expect(host.running.get().map((entry) => entry.feature.id)).toEqual(['a', 'e']);
  });

  it('disposes a feature that was switched off while it was starting', async () => {
    const settings = new Store<Settings>(DEFAULT_SETTINGS);
    const ctx = { doc: document, settings, storage: new MemoryStorage() } as unknown as AppContext;
    const dispose = vi.fn();
    let finish!: () => void;
    const slow: Feature = {
      ...feature('slow', []),
      start: () => new Promise((resolve) => (finish = () => resolve({ dispose }))),
    };
    const host = new FeatureHost([slow], ctx);
    host.start();
    settings.set({ ...DEFAULT_SETTINGS, features: { slow: false } });
    finish();
    await new Promise((resolve) => setTimeout(resolve));
    expect(dispose).toHaveBeenCalledOnce();
    expect(host.running.get()).toEqual([]);
    expect(document.querySelector('style[data-ptm-feature="slow"]')).toBeNull();
  });

  it('stop() stops every running feature', async () => {
    const log: string[] = [];
    const settings = new Store<Settings>(DEFAULT_SETTINGS);
    const ctx = { doc: document, settings, storage: new MemoryStorage() } as unknown as AppContext;
    const host = new FeatureHost([feature('a', log), { ...feature('e', log), early: true }], ctx);
    host.startEarly();
    host.start();
    await Promise.resolve();
    host.stop();
    expect(log).toEqual(['start e', 'start a', 'stop a', 'stop e']);
    expect(host.running.get()).toEqual([]);
  });
});
