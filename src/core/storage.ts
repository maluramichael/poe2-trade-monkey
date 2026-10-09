import { log } from './log';
import { Store } from './store';

/** Async key-value storage. Values must be JSON-serialisable. */
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | undefined>;
  /** The stored JSON string, unparsed. */
  getRaw(key: string): Promise<string | undefined>;
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
  /** Last raw string this tab read or wrote per key, to detect changes from other tabs. */
  readonly #known = new Map<string, string | undefined>();

  async get<T>(key: string): Promise<T | undefined> {
    return parse<T>(key, await this.getRaw(key));
  }

  async getRaw(key: string): Promise<string | undefined> {
    const raw = await GM.getValue<string | undefined>(PREFIX + key, undefined);
    this.#known.set(key, raw);
    return raw;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    this.#known.set(key, raw);
    await GM.setValue(PREFIX + key, raw);
  }

  async delete(key: string): Promise<void> {
    this.#known.set(key, undefined);
    await GM.deleteValue(PREFIX + key);
  }

  onRemoteChange<T>(key: string, callback: (value: T | undefined) => void): () => void {
    if (typeof GM_addValueChangeListener !== 'function') {
      // Greasemonkey 4 has no change listener: re-read when the tab becomes active again.
      const check = async () => {
        if (document.visibilityState !== 'visible') return;
        const raw = await GM.getValue<string | undefined>(PREFIX + key, undefined);
        if (raw === this.#known.get(key)) return;
        this.#known.set(key, raw);
        callback(parse<T>(key, raw));
      };
      const onEvent = () => void check().catch((error) => log.error(`re-reading "${key}" failed`, error));
      window.addEventListener('focus', onEvent);
      document.addEventListener('visibilitychange', onEvent);
      return () => {
        window.removeEventListener('focus', onEvent);
        document.removeEventListener('visibilitychange', onEvent);
      };
    }
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

  async getRaw(key: string): Promise<string | undefined> {
    return this.data.get(key);
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
  /** Upgrades data written by an older schema. Unreadable data is backed up to `<key>:backup`, then the default is used. */
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
  const decode = (envelope: unknown): { ok: true; value: T } | { ok: false } => {
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) return { ok: false };
    const { schema, data } = envelope as Envelope<unknown>;
    if (schema === options.schema) return { ok: true, value: data as T };
    // Newer schema means the script was downgraded: never let old code reshape newer data.
    if (!(schema < options.schema) || !options.migrate) return { ok: false };
    try {
      return { ok: true, value: options.migrate(data, schema) };
    } catch (error) {
      log.error(`migration of "${key}" from schema ${schema} failed`, error);
      return { ok: false };
    }
  };

  let initial = options.defaultValue;
  const raw = await storage.getRaw(key);
  if (raw !== undefined && raw !== null) {
    let reason: string | undefined;
    try {
      const result = decode(JSON.parse(raw));
      if (result.ok) initial = result.value;
      else reason = 'unknown schema or shape';
    } catch {
      reason = 'invalid JSON';
    }
    if (reason) {
      // Keep the unreadable data, the next save would otherwise overwrite it for good.
      log.error(`stored value "${key}" could not be loaded (${reason}), backed up to "${key}:backup"`);
      await storage.set(`${key}:backup`, raw).catch((error) => {
        log.error(`backing up "${key}" failed`, error);
      });
    }
  }

  const store = new Store<T>(initial);
  let applyingRemote = false;

  store.subscribe((value) => {
    if (applyingRemote) return;
    storage.set<Envelope<T>>(key, { schema: options.schema, data: value }).catch((error) => {
      log.error(`saving "${key}" failed`, error);
    });
  });

  storage.onRemoteChange<Envelope<unknown>>(key, (envelope) => {
    const result = decode(envelope);
    if (!result.ok) {
      log.warn(`ignoring remote change of "${key}" with unknown schema or shape`);
      return;
    }
    applyingRemote = true;
    try {
      store.set(result.value);
    } finally {
      applyingRemote = false;
    }
  });

  return store;
}
