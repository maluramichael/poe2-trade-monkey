/** Typed publish/subscribe channel. `Events` maps event names to payload types. */
export class EventBus<Events extends Record<string, unknown>> {
  readonly #handlers = new Map<keyof Events, Set<(payload: never) => void>>();

  on<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void): () => void {
    let set = this.#handlers.get(name);
    if (!set) this.#handlers.set(name, (set = new Set()));
    set.add(handler as (payload: never) => void);
    return () => set.delete(handler as (payload: never) => void);
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    for (const handler of [...(this.#handlers.get(name) ?? [])]) {
      try {
        (handler as (payload: Events[K]) => void)(payload);
      } catch (error) {
        console.error(`[ptm] handler for "${String(name)}" failed`, error);
      }
    }
  }
}
