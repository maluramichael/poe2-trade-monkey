import { homedir } from 'node:os';
import { expect, test, type Page } from '@playwright/test';
import { PAGE_URL, setupFakeSite } from './fake-site';

/**
 * Screenshots of the main UI states on the fake trade page, for design reviews without the live
 * site. Run with: PTM_SCREENS=1 npx playwright test e2e/screens.spec.ts
 */
const DIR = `${homedir()}/.claude/screenshots/pathofexile2trademonkey/offline`;

test.skip(!process.env.PTM_SCREENS, 'set PTM_SCREENS=1 to take screenshots');
test.use({ viewport: { width: 1920, height: 1080 } });

/** The site's real stylesheets (public CDN, no login, no Cloudflare check) for realistic shots. */
const SITE_CSS = [
  'trade.CWybe7yKFwAA', 'chunk.cPtk7Gt2b9yC', 'chunk.CVUyA65b6iKx', 'chunk.Bu2FJzTrkyQu', 'chunk.sOL4Z4VkxCxP',
  'chunk.DlXZ1iK5b7tj', 'chunk.DQ7TqNqiKhKT', 'chunk.CLAD-CyBV90u', 'chunk.D4nVfHo5F5z6', 'chunk.CANKkviOHVgg',
].map((name) => `https://web.poecdn.com/dist/css/${name}.css`);

/** Hashed names change with site deploys; a stylesheet the CDN dropped is skipped, not fatal. */
async function addSiteCss(page: Page): Promise<number> {
  let missing = 0;
  for (const url of SITE_CSS) {
    await page.addStyleTag({ url }).catch(() => {
      missing++;
      console.warn(`site CSS missing: ${url}`);
    });
  }
  return missing;
}

test('bookmarks, pins and settings', async ({ context, page }) => {
  await setupFakeSite(context);
  // Registered last, so it wins over the catch-all route of the fake site.
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  await addSiteCss(page);
  const sidebar = page.locator('.ptm-sidebar');
  await expect(sidebar).toBeVisible();
  await page.evaluate(() => (window as unknown as { __fakeSite: { search(): Promise<unknown> } }).__fakeSite.search());

  for (const [title, icon] of [['Gear', 'titan'], ['Crafting bases', 'exalt'], ['Mapping', 'waystone']] as const) {
    await sidebar.getByRole('button', { name: 'New folder' }).click();
    const dialog = page.getByRole('dialog', { name: 'New folder' });
    await dialog.getByRole('textbox').fill(title);
    await dialog.locator(`img[src*="/${icon}.png"]`).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
  }
  await sidebar.getByRole('button', { name: 'Save current search' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await page.screenshot({ path: `${DIR}/01-bookmarks.png` });

  await page.locator('.ptm-pin-btn').first().click();
  await page.screenshot({ path: `${DIR}/02-pins.png` });

  await sidebar.getByRole('button', { name: 'Settings' }).click();
  await page.screenshot({ path: `${DIR}/03-settings.png` });
});

test('german interface', async ({ context, page }) => {
  await setupFakeSite(context);
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  await addSiteCss(page);
  const sidebar = page.locator('.ptm-sidebar');
  await expect(sidebar).toBeVisible();
  await page.evaluate(() => (window as unknown as { __fakeSite: { search(): Promise<unknown> } }).__fakeSite.search());

  await sidebar.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog').locator('select').selectOption('de');
  await page.screenshot({ path: `${DIR}/04-settings-de.png` });
  await page.keyboard.press('Escape');

  await sidebar.getByRole('button', { name: 'Neuer Ordner' }).click();
  await page.screenshot({ path: `${DIR}/05-folder-modal-de.png` });
  await page.keyboard.press('Escape');
  await sidebar.getByRole('tab', { name: 'Verlauf' }).click();
  await page.screenshot({ path: `${DIR}/06-history-de.png` });
});

test('two columns at medium width: item card and price do not overlap', async ({ context, page }) => {
  await page.setViewportSize({ width: 1720, height: 980 });
  await setupFakeSite(context);
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  test.skip((await addSiteCss(page)) > 0, 'the CDN dropped a site stylesheet, update SITE_CSS from the live page');
  // The fake page's stand-in row CSS is for offline smoke tests; the real CSS decides here.
  await page.evaluate(() => document.querySelector('head > style')?.remove());
  await expect(page.locator('html.ptm-layout-split')).toBeAttached();
  const row = page.locator('#vue3-portal .resultset > .row[data-id]').first();
  const [card, price] = await Promise.all([row.locator('.item-popup').boundingBox(), row.locator('.right').boundingBox()]);
  expect(card!.x + card!.width).toBeLessThanOrEqual(price!.x + 1);
  await page.screenshot({ path: `${DIR}/06-split-1720.png` });
});

test('narrow window: the sidebar covers the page instead of squeezing it', async ({ context, page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await setupFakeSite(context);
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  await addSiteCss(page);
  await expect(page.locator('.ptm-sidebar')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).paddingRight)).toBe('0px');
  await page.screenshot({ path: `${DIR}/08-narrow-820.png` });
  await page.locator('.ptm-sidebar').getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('.ptm-expand-tab')).toBeFocused();
  await page.screenshot({ path: `${DIR}/09-narrow-collapsed.png` });
});

test('narrow filter column: labels and quick filters are not cut', async ({ context, page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await setupFakeSite(context);
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  test.skip((await addSiteCss(page)) > 0, 'the CDN dropped a site stylesheet, update SITE_CSS from the live page');
  await page.evaluate(() => document.querySelector('head > style')?.remove());
  await expect(page.locator('html.ptm-layout-split')).toBeAttached();
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.filter-property .filter-title, .ptm-qf__btn > span')]
      .filter((el) => el.offsetWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent!.trim()),
  );
  expect(cut).toEqual([]);
  await page.screenshot({ path: `${DIR}/10-narrow-filters-1600.png` });
});
