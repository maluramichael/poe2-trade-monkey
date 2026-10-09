import { DURATIONS, createToaster } from './toaster';

describe('toaster', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps each kind for its own duration, errors until dismissed', () => {
    const toast = createToaster();
    toast('ok');
    toast('careful', 'warning');
    toast('broken', 'error');
    vi.advanceTimersByTime(DURATIONS.success);
    expect(toast.toasts.get().map((t) => t.message)).toEqual(['careful', 'broken']);
    vi.advanceTimersByTime(DURATIONS.warning - DURATIONS.success);
    expect(toast.toasts.get().map((t) => t.message)).toEqual(['broken']);
    vi.advanceTimersByTime(60_000);
    const [error] = toast.toasts.get();
    expect(error?.kind).toBe('error');
    toast.dismiss(error!.id);
    expect(toast.toasts.get()).toEqual([]);
  });

  it('does not show the same visible message twice', () => {
    const toast = createToaster();
    toast('broken', 'error');
    toast('broken', 'error');
    toast('broken', 'warning');
    expect(toast.toasts.get().map((t) => t.kind)).toEqual(['error', 'warning']);
  });
});
