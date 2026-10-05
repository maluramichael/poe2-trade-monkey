import { expect, test, type Page } from '@playwright/test';
import { PAGE_URL, SEARCH_ID, setupFakeSite } from './fake-site';

let ptmErrors: string[];

test.beforeEach(async ({ context, page }) => {
  await setupFakeSite(context);
  ptmErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('[ptm]')) ptmErrors.push(msg.text());
  });
  page.on('pageerror', (error) => ptmErrors.push(String(error)));
});

test.afterEach(() => {
  expect(ptmErrors).toEqual([]);
});

/** Opens the search page, waits for the sidebar, then lets the fake site run its search like a user click would. */
async function open(page: Page): Promise<void> {
  await page.goto(PAGE_URL);
  await expect(page.locator('#ptm-root .ptm-sidebar')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __fakeSite: { search(): Promise<unknown> } }).__fakeSite.search());
}

const persistent = (page: Page) =>
  page.evaluate(() => (window as unknown as { app: { $store: { state: { persistent: Record<string, any> } } } }).app.$store.state.persistent);

const sidebar = (page: Page) => page.locator('.ptm-sidebar');

test('sidebar renders with its tabs', async ({ page }) => {
  await open(page);
  await expect(sidebar(page).getByRole('tab')).toHaveText(['Bookmarks', 'History', 'Pins']);
});

test('bookmarks: folder and saved search survive a reload', async ({ page }) => {
  await open(page);
  const panel = sidebar(page);
  await panel.getByRole('button', { name: 'New folder' }).click();
  const folderDialog = page.getByRole('dialog', { name: 'New folder' });
  await folderDialog.getByLabel('Title').fill('Gear');
  await folderDialog.getByRole('button', { name: 'Save' }).click();
  await expect(folderDialog).toBeHidden();

  await panel.getByRole('button', { name: 'Save current search' }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Save search' });
  await saveDialog.getByLabel('Title').fill('Amulets');
  await saveDialog.getByRole('button', { name: 'Save' }).click();
  await expect(saveDialog).toBeHidden();

  const check = async () => {
    await expect(panel.locator('.ptm-bm-folder__title')).toHaveText(['Gear']);
    const link = panel.getByRole('link', { name: 'Amulets' });
    await expect(link).toHaveAttribute('href', new RegExp(`/trade2/search/poe2/Standard/${SEARCH_ID}$`));
  };
  await check();
  await page.reload();
  await expect(sidebar(page)).toBeVisible();
  await check();
});

test('history shows the current search', async ({ page }) => {
  await open(page);
  await sidebar(page).getByRole('tab', { name: 'History' }).click();
  const entry = sidebar(page).locator('.ptm-history__title');
  await expect(entry).toHaveCount(1);
  await expect(entry).toHaveAttribute('href', `/trade2/search/poe2/Standard/${SEARCH_ID}`);
});

test('pins: pin a result, see the card, unpin', async ({ page }) => {
  await open(page);
  const row = page.locator('#vue3-portal .resultset > .row[data-id]').first();
  await row.getByRole('button', { name: 'Pin', exact: true }).click();
  await expect(sidebar(page).getByRole('tab', { name: 'Pins' })).toHaveAttribute('aria-selected', 'true');
  const card = sidebar(page).locator('.ptm-pin');
  await expect(card).toHaveCount(1);
  await expect(card.locator('.item-popup')).toBeVisible();
  await expect(card).toContainText('Seller: Seller1#0001');

  await card.getByRole('button', { name: 'Unpin' }).click();
  await expect(card).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Pin', exact: true })).toBeVisible();
});

test('mod actions: "+" adds the stat to the search form', async ({ page }) => {
  await open(page);
  const mod = page.locator('#vue3-portal .resultset > .row[data-id]').first().locator('.item-mod--explicit').first();
  const field = await mod.locator('[data-field^="stat."]').getAttribute('data-field');
  await mod.hover();
  await mod.locator('.ptm-mod-action--add').click();
  await expect
    .poll(async () => (await persistent(page)).stats.flatMap((group: { filters: { id: string }[] }) => group.filters.map((f) => f.id)))
    .toContain(field!.slice('stat.'.length));
});

test('quick filters: Corrupted cycles to "no"', async ({ page }) => {
  await open(page);
  const corrupted = page.locator('.ptm-qf [data-filter="corrupted"]');
  await corrupted.click();
  await expect(corrupted).toHaveAttribute('data-state', 'yes');
  await corrupted.click();
  await expect(corrupted).toHaveAttribute('data-state', 'no');
  expect((await persistent(page)).filters.misc_filters.filters.corrupted.option).toBe('false');
});

test('settings: switching Bookmarks off removes its tab', async ({ page }) => {
  await open(page);
  await sidebar(page).getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  const toggle = dialog.locator('.ptm-checkbox', { hasText: 'Bookmarks' });
  const tab = sidebar(page).getByRole('tab', { name: 'Bookmarks' });

  await toggle.click();
  await expect(toggle.getByRole('checkbox')).not.toBeChecked();
  await expect(tab).toHaveCount(0);
  await toggle.click();
  await expect(toggle.getByRole('checkbox')).toBeChecked();
  await expect(tab).toHaveCount(1);
});
