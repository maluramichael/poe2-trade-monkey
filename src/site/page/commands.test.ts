import { handleCommand } from './commands';
import type { TradeApp } from './vue';

function fakeApp(options: { mutations?: Record<string, unknown> | null; throws?: boolean } = {}) {
  const calls: [string, unknown][] = [];
  const state = { persistent: { stats: [{ type: 'and', filters: [] }] }, transient: {} };
  const app = {
    $store: {
      state,
      ...(options.mutations === null ? {} : { _mutations: options.mutations ?? { setStatFilter: [() => {}] } }),
      commit(type: string, payload: unknown) {
        if (options.throws) throw new Error('boom');
        calls.push([type, payload]);
      },
      subscribe: () => () => {},
    },
  } as unknown as TradeApp;
  return { app, calls, state };
}

describe('handleCommand', () => {
  it('commits a known mutation', () => {
    const { app, calls } = fakeApp();
    expect(handleCommand(app, { kind: 'commit', requestId: 1, mutation: 'setStatFilter', payload: 1 })).toEqual({
      kind: 'reply', requestId: 1, ok: true, value: null,
    });
    expect(calls).toEqual([['setStatFilter', 1]]);
  });

  it('rejects an unknown mutation without committing', () => {
    const { app, calls } = fakeApp();
    const reply = handleCommand(app, { kind: 'commit', requestId: 2, mutation: 'persistent/setStatFilter', payload: 1 });
    expect(reply).toMatchObject({ kind: 'reply', requestId: 2, ok: false });
    expect((reply as { error: string }).error).toMatch(/^unknown-mutation/);
    expect(calls).toEqual([]);
  });

  it('commits when the store has no _mutations', () => {
    const { app, calls } = fakeApp({ mutations: null });
    expect(handleCommand(app, { kind: 'commit', requestId: 3, mutation: 'anything', payload: 1 })).toMatchObject({ ok: true });
    expect(calls).toEqual([['anything', 1]]);
  });

  it('reports a throwing commit', () => {
    const { app } = fakeApp({ throws: true });
    const reply = handleCommand(app, { kind: 'commit', requestId: 4, mutation: 'setStatFilter', payload: 1 });
    expect(reply).toMatchObject({ ok: false });
    expect((reply as { error: string }).error).toContain('boom');
  });

  it('returns a deep copy of the persistent state', () => {
    const { app, state } = fakeApp();
    const reply = handleCommand(app, { kind: 'getState', requestId: 5 }) as { ok: true; value: typeof state.persistent };
    expect(reply.value).toEqual(state.persistent);
    expect(reply.value).not.toBe(state.persistent);
    expect(reply.value.stats).not.toBe(state.persistent.stats);
  });
});
