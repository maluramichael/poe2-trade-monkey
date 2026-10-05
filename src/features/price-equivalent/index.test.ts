import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../core/i18n';
import { createTestContext, type TestContext } from '../../test/context';
import type { FetchResult } from '../../site/tradeTypes';
import type { FeatureInstance } from '../types';
import { priceEquivalentFeature } from './index';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const overview = read('./ninja-overview.fixture.json');
const staticData = JSON.parse(read('../../test/fixtures/static.json'));
const listings = (JSON.parse(read('../../test/fixtures/fetch.json')) as { result: FetchResult[] }).result;

const location = (league: string) => ({ type: 'search' as const, realm: 'poe2', league, id: null, live: false });

describe('price-equivalent feature', () => {
  let ctx: TestContext;
  let instance: FeatureInstance | void;
  let requests: string[];

  beforeEach(() => {
    setLocale('en');
    requests = [];
    vi.stubGlobal('GM', {
      xmlHttpRequest: (details: { url: string; onload: (r: { status: number; responseText: string }) => void }) => {
        requests.push(details.url);
        details.onload({ status: 200, responseText: overview });
      },
    });
    document.body.innerHTML = read('../../test/fixtures/result-rows.html');
    ctx = createTestContext({ location: location('Runes of Aldur'), data: { static: staticData } });
    // Fixture prices are 1 to 5 exalted, below the divine threshold. Give two rows bigger prices.
    const results = structuredClone(listings);
    results[0]!.listing.price = { type: '~price', amount: 1030, currency: 'exalted' };
    results[1]!.listing.price = { type: '~price', amount: 2, currency: 'divine' };
    ctx.emitListings(results);
  });

  afterEach(() => {
    instance?.dispose?.();
    vi.unstubAllGlobals();
  });

  const lines = () => [...document.querySelectorAll('.ptm-price-equivalent')];

  async function startAndRender(): Promise<void> {
    instance = await priceEquivalentFeature.start(ctx);
    await vi.waitFor(() => {
      ctx.results.flush();
      expect(lines().length).toBeGreaterThan(0);
    });
  }

  it('appends the equivalent under the price with currency icons', async () => {
    await startAndRender();
    expect(document.querySelectorAll('.row[data-id]').length).toBeGreaterThanOrEqual(2);
    expect(lines()).toHaveLength(2);

    const [first, second] = lines();
    expect(first!.parentElement!.matches('[data-field="price"]')).toBe(true);
    expect(first!.textContent).toContain('≈ 2');
    expect(first!.querySelector('img')!.getAttribute('alt')).toBe('Divine Orb');
    expect(second!.textContent).toContain('≈ 1,031');
    expect(second!.querySelector('img')!.getAttribute('alt')).toBe('Exalted Orb');
    expect(requests).toEqual(['https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Runes%20of%20Aldur&type=Currency']);
  });

  it('re-renders on league change', async () => {
    await startAndRender();
    ctx.location.set(location('Standard'));
    expect(lines()).toHaveLength(0);
    await vi.waitFor(() => {
      ctx.results.flush();
      expect(lines()).toHaveLength(2);
    });
    expect(requests).toHaveLength(2);
  });

  it('removes everything on dispose', async () => {
    await startAndRender();
    instance?.dispose?.();
    instance = undefined;
    ctx.results.flush();
    expect(lines()).toHaveLength(0);
  });
});
