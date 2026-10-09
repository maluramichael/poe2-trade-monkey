import { PageBridge } from './client';
import { CONTENT_TO_PAGE, PAGE_TO_CONTENT } from './protocol';

function fakePage(handler: (command: { kind: string; requestId: number }) => unknown) {
  window.addEventListener(CONTENT_TO_PAGE, (event) => {
    const command = JSON.parse((event as CustomEvent<string>).detail);
    const reply = { kind: 'reply', requestId: command.requestId, ok: true, value: handler(command) };
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify(reply) }));
  });
}

describe('PageBridge', () => {
  it('answers commands through the page', async () => {
    fakePage((command) => (command.kind === 'getState' ? { league: 'Standard' } : null));
    const bridge = new PageBridge(window);
    await expect(bridge.getState()).resolves.toEqual({ league: 'Standard' });
  });

  it('emits ready and captured searches', async () => {
    const bridge = new PageBridge(window);
    const searches: unknown[] = [];
    bridge.events.on('search', (captured) => searches.push(captured));
    const ready = bridge.whenReady();
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify({ kind: 'ready' }) }));
    await ready;
    window.dispatchEvent(
      new CustomEvent(PAGE_TO_CONTENT, {
        detail: JSON.stringify({ kind: 'search', captured: { type: 'search', league: 'Standard' } }),
      }),
    );
    expect(bridge.isReady).toBe(true);
    expect(searches).toEqual([{ type: 'search', league: 'Standard' }]);
  });

  it('ignores broken JSON from the page', () => {
    new PageBridge(window);
    expect(() => window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: '{nope' }))).not.toThrow();
  });

  it('emits rateLimited with the wait time', () => {
    const bridge = new PageBridge(window);
    const waits: number[] = [];
    bridge.events.on('rateLimited', (ms) => waits.push(ms));
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify({ kind: 'rateLimited', retryAfterMs: 3000 }) }));
    expect(waits).toEqual([3000]);
  });
});
