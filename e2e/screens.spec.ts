import { homedir } from 'node:os';
import { expect, test } from '@playwright/test';
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
  'chunk.BcENQw-3r0o4', 'chunk.DQ7TqNqiKhKT', 'chunk.CLAD-CyBV90u', 'chunk.FsMMKz2Rmvhd', 'chunk.CANKkviOHVgg',
].map((name) => `https://web.poecdn.com/dist/css/${name}.css`);

test('bookmarks, pins and settings', async ({ context, page }) => {
  await setupFakeSite(context);
  // Registered last, so it wins over the catch-all route of the fake site.
  await context.route('https://web.poecdn.com/**', (route) => route.continue());
  await page.goto(PAGE_URL);
  for (const url of SITE_CSS) await page.addStyleTag({ url });
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
