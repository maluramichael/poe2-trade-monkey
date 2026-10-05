import { log } from './log';
import { Store } from './store';

/** Async key-value storage. Values must be JSON-serialisable. */
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** Fires when another tab changed the key. Returns an unsubscribe function. */
  onRemoteChange<T>(key: string, callback: (value: T | undefined) => void): () => void;
}

const PREFIX = 'ptm:';

/**
 * Userscript storage via the async `GM.*` API, which Violentmonkey, Tampermonkey and
 * Greasemonkey 4 all support. Values are stored as JSON strings so every manager behaves the
 * same. Cross-tab sync uses `GM_addValueChangeListener` where available (not in Greasemonkey 4).
 */
export class GmStorage implements KeyValueStorage {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = await GM.getValue<string | undefined>(PREFIX + key, undefined);
    return parse<T>(key, raw);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await GM.setValue(PREFIX + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await GM.deleteValue(PREFIX + key);
  }

  onRemoteChange<T>(key: string, callback: (value: T | undefined) => void): () => void {
    if (typeof GM_addValueChangeListener !== 'function') return () => {};
    const id = GM_addValueChangeListener(PREFIX + key, (_name, _old, value, remote) => {
      if (remote) callback(parse<T>(key, value as string | undefined));
    });
    return () => GM_removeValueChangeListener(id);
  }
}

/** In-memory storage for tests. `simulateRemoteChange` mimics a write from another tab. */
export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  readonly #listeners = new Map<string, Set<(value: unknown) => void>>();

  async get<T>(key: string): Promise<T | undefined> {
    return parse<T>(key, this.data.get(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  onRemoteChange<T>(key: string, callback: (value: T | undefined) => void): () => void {
    let set = this.#listeners.get(key);
    if (!set) this.#listeners.set(key, (set = new Set()));
    set.add(callback as (value: unknown) => void);
    return () => set.delete(callback as (value: unknown) => void);
  }

  simulateRemoteChange(key: string, value: unknown): void {
    this.data.set(key, JSON.stringify(value));
    for (const callback of this.#listeners.get(key) ?? []) callback(value);
  }
}

function parse<T>(key: string, raw: string | undefined): T | undefined {
  if (raw === undefined || raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    log.error(`stored value "${key}" is not valid JSON, ignoring it`, error);
    return undefined;
  }
}

interface Envelope<T> {
  schema: number;
  data: T;
}

export interface PersistOptions<T> {
  defaultValue: T;
  /** Current schema version. Bump it and extend `migrate` when the shape of `T` changes. */
  schema: number;
  /** Upgrades data written by an older schema. Unknown or broken data falls back to the default. */
  migrate?: (data: unknown, fromSchema: number) => T;
}

/**
 * Loads a value into a `Store` and writes every change back. Changes made in other tabs are
 * applied to the store without being written again.
 */
export async function persistedStore<T>(
  storage: KeyValueStorage,
  key: string,
  options: PersistOptions<T>,
): Promise<Store<T>> {
  const read = (envelope: Envelope<unknown> | undefined): T => {
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) return options.defaultValue;
    if (envelope.schema === options.schema) return envelope.data as T;
    if (options.migrate) {
      try {
        return options.migrate(envelope.data, envelope.schema);
      } catch (error) {
        log.error(`migration of "${key}" from schema ${envelope.schema} failed`, error);
      }
    }
    return options.defaultValue;
  };

  const store = new Store<T>(read(await storage.get<Envelope<unknown>>(key)));
  let applyingRemote = false;

  store.subscribe((value) => {
    if (applyingRemote) return;
    storage.set<Envelope<T>>(key, { schema: options.schema, data: value }).catch((error) => {
      log.error(`saving "${key}" failed`, error);
    });
  });

  storage.onRemoteChange<Envelope<unknown>>(key, (envelope) => {
    applyingRemote = true;
    try {
      store.set(read(envelope));
    } finally {
      applyingRemote = false;
    }
  });

  return store;
}
