import { useEffect, useState } from 'preact/hooks';

export type Listener<T> = (value: T, previous: T) => void;

/**
 * Minimal observable value. Features keep their state in stores, the UI subscribes via
 * `useStore`. Values are treated as immutable: always pass a new object to `set`.
 */
export class Store<T> {
  #value: T;
  readonly #listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.#value = initial;
  }

  get(): T {
    return this.#value;
  }

  set(next: T): void {
    if (Object.is(next, this.#value)) return;
    const previous = this.#value;
    this.#value = next;
    for (const listener of [...this.#listeners]) listener(next, previous);
  }

  update(fn: (value: T) => T): void {
    this.set(fn(this.#value));
  }

  subscribe(listener: Listener<T>): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

/** Re-renders the component whenever the store (or the selected slice) changes. */
export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, select: (value: T) => S): S;
export function useStore<T, S>(store: Store<T>, select?: (value: T) => S): T | S {
  const pick = (value: T) => (select ? select(value) : value);
  const [slice, setSlice] = useState(() => pick(store.get()));
  useEffect(() => {
    setSlice(() => pick(store.get()));
    return store.subscribe((value) => setSlice(() => pick(value)));
  }, [store]);
  return slice;
}
