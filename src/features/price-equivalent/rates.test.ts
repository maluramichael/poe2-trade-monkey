import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../../core/storage';
import { NINJA_URL, parseRates, RateSource } from './rates';

// A literal `new URL('./x', import.meta.url)` gets rewritten by Vite to an http asset URL.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const overview = JSON.parse(read('./ninja-overview.fixture.json'));

describe('parseRates', () => {
  it('maps trade currency ids to their value in divine', () => {
    const rates = parseRates(overview);
    expect(rates.get('divine')).toBe(1);
    expect(rates.get('exalted')).toBeCloseTo(1 / 515.7, 5);
    expect(rates.get('chaos')).toBeCloseTo(0.1253);
    expect(rates.get('mirror')).toBe(5960);
  });

  it('normalises to divine when poe.ninja uses another primary currency', () => {
    const rates = parseRates({ lines: [{ id: 'chaos', primaryValue: 1 }, { id: 'divine', primaryValue: 8 }] });
    expect(rates.get('chaos')).toBe(0.125);
  });

  it('returns no rates for an unknown league or garbage', () => {
    expect(parseRates({ core: { items: [], rates: {}, primary: 'chaos' }, lines: [], items: [] }).size).toBe(0);
    expect(parseRates(null).size).toBe(0);
    expect(parseRates({ lines: [{ id: 'chaos', primaryValue: 'x' }, { id: 'divine', primaryValue: 1 }] }).has('chaos')).toBe(false);
  });
});

describe('RateSource', () => {
  let storage: MemoryStorage;
  let http: ReturnType<typeof vi.fn<(url: string) => Promise<unknown>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    storage = new MemoryStorage();
    http = vi.fn(async () => overview);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('requests the league from poe.ninja with an encoded name', async () => {
    await new RateSource(storage, http).get('Runes of Aldur');
    expect(http).toHaveBeenCalledWith(`${NINJA_URL}?league=Runes%20of%20Aldur&type=Currency`);
  });

  it('caches per league for 60 minutes in storage', async () => {
    const source = new RateSource(storage, http);
    await source.get('Runes of Aldur');
    expect(storage.data.has('price-equivalent:rates:Runes of Aldur')).toBe(true);

    vi.advanceTimersByTime(59 * 60 * 1000);
    expect((await new RateSource(storage, http).get('Runes of Aldur')).get('chaos')).toBeCloseTo(0.1253);
    expect(http).toHaveBeenCalledTimes(1);

    await source.get('Standard');
    expect(http).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(2 * 60 * 1000);
    await source.get('Runes of Aldur');
    expect(http).toHaveBeenCalledTimes(3);
  });

  it('shares one in-flight request per league', async () => {
    const source = new RateSource(storage, http);
    await Promise.all([source.get('Standard'), source.get('Standard')]);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('returns empty rates on failure and logs once', async () => {
    http.mockRejectedValue(new Error('offline'));
    const rates = await new RateSource(storage, http).get('Standard');
    expect(rates.size).toBe(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(storage.data.size).toBe(0);
  });
});
