import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmStorage, MemoryStorage, persistedStore } from './storage';

const KEY = 'bookmarks';
const opts = { defaultValue: ['default'], schema: 1 };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('persistedStore', () => {
  it('uses the default without a backup when nothing is stored', async () => {
    const storage = new MemoryStorage();
    const store = await persistedStore(storage, KEY, opts);
    expect(store.get()).toEqual(['default']);
    expect(storage.data.has(`${KEY}:backup`)).toBe(false);
  });

  it('backs up broken JSON before falling back to the default', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = new MemoryStorage();
    storage.data.set(KEY, 'nicht json');
    const store = await persistedStore(storage, KEY, opts);
    expect(store.get()).toEqual(['default']);
    expect(await storage.get(`${KEY}:backup`)).toBe('nicht json');
    store.set(['neu']);
    await Promise.resolve();
    expect(JSON.parse(storage.data.get(KEY)!)).toEqual({ schema: 1, data: ['neu'] });
    expect(await storage.get(`${KEY}:backup`)).toBe('nicht json');
  });

  it('does not migrate data from a newer schema and backs it up', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ schema: 2, data: ['neuer'] });
    storage.data.set(KEY, raw);
    const migrate = vi.fn(() => ['migriert']);
    const store = await persistedStore(storage, KEY, { ...opts, migrate });
    expect(migrate).not.toHaveBeenCalled();
    expect(store.get()).toEqual(['default']);
    expect(await storage.get(`${KEY}:backup`)).toBe(raw);
  });

  it('backs up when migrate throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ schema: 0, data: ['alt'] });
    storage.data.set(KEY, raw);
    const store = await persistedStore(storage, KEY, {
      ...opts,
      migrate: () => {
        throw new Error('kaputt');
      },
    });
    expect(store.get()).toEqual(['default']);
    expect(await storage.get(`${KEY}:backup`)).toBe(raw);
  });

  it('uses migrated data without a backup', async () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, JSON.stringify({ schema: 0, data: ['alt'] }));
    const store = await persistedStore(storage, KEY, { ...opts, migrate: () => ['migriert'] });
    expect(store.get()).toEqual(['migriert']);
    expect(storage.data.has(`${KEY}:backup`)).toBe(false);
  });

  it('applies valid remote changes without writing them back', async () => {
    const storage = new MemoryStorage();
    const store = await persistedStore(storage, KEY, opts);
    const set = vi.spyOn(storage, 'set');
    storage.simulateRemoteChange(KEY, { schema: 1, data: ['remote'] });
    expect(store.get()).toEqual(['remote']);
    expect(set).not.toHaveBeenCalled();
  });

  it('ignores remote changes with an unknown schema', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = new MemoryStorage();
    const store = await persistedStore(storage, KEY, opts);
    store.set(['eigen']);
    storage.simulateRemoteChange(KEY, { schema: 9, data: ['fremd'] });
    expect(store.get()).toEqual(['eigen']);
  });
});

describe('GmStorage without GM_addValueChangeListener', () => {
  it('detects external changes on window focus', async () => {
    const values = new Map<string, unknown>();
    vi.stubGlobal('GM', {
      getValue: async (k: string, d: unknown) => (values.has(k) ? values.get(k) : d),
      setValue: async (k: string, v: unknown) => void values.set(k, v),
      deleteValue: async (k: string) => void values.delete(k),
    });
    const storage = new GmStorage();
    await storage.set('k', { a: 1 });
    const callback = vi.fn();
    const off = storage.onRemoteChange('k', callback);

    values.set('ptm:k', JSON.stringify({ a: 2 }));
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith({ a: 2 });

    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 10));
    expect(callback).toHaveBeenCalledTimes(1);
    off();
  });
});
