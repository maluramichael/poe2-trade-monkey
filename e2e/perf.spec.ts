import { expect, test } from '@playwright/test';
import { PAGE_URL, setupFakeSite } from './fake-site';

// Booting must not shift the already painted page (CLS from sidebar padding and the layout feature).
test('boot causes no noticeable layout shift', async ({ context, page }) => {
  await setupFakeSite(context);
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(PAGE_URL);
  await expect(page.locator('#ptm-root .ptm-sidebar')).toBeVisible();
  await page.waitForTimeout(1000);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});
