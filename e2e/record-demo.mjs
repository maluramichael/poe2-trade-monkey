// Records the README demo against the real, logged-in Chrome (see CLAUDE.md, live testing).
// Usage: node e2e/record-demo.mjs <frames-dir>   (needs the userscript injected via live-inject.mjs)
// Writes JPEG frames plus frames.txt (ffmpeg concat list with real frame durations).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? '/tmp/ptm-demo';
const LEAGUE = 'Forbidden Rites';
const QUERY = {
  query: {
    status: { option: 'online' },
    stats: [{ type: 'and', filters: [] }],
    filters: { type_filters: { filters: { category: { option: 'accessory.amulet' }, rarity: { option: 'rare' } } } },
  },
  sort: { price: 'asc' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
const page = browser.contexts()[0].pages().find((p) => p.url().includes('/trade2/'));
const cdp = await page.context().newCDPSession(page);

const { windowId } = await cdp.send('Browser.getWindowForTarget');
await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 2000, height: 1100 } });

// Fresh demo state: the dev GM shim keeps everything in localStorage.
await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('__gm_shim:')).forEach((k) => localStorage.removeItem(k)));
await page.goto(`https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(LEAGUE)}?q=${encodeURIComponent(JSON.stringify(QUERY))}`);
await page.waitForSelector('#vue3-portal .resultset > .row[data-id] .ptm-mod-action', { state: 'attached', timeout: 30000 });
await sleep(1500);

// Fake cursor (CDP input has none on screen) and blurred account names.
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = `
    #demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; width: 26px; height: 26px; transform: translate(-100px, -100px); }
    #demo-cursor .ring { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #f0c060; opacity: 0; }
    #demo-cursor.down .ring { animation: demo-click .45s ease-out; }
    @keyframes demo-click { from { opacity: 1; transform: scale(.4); } to { opacity: 0; transform: scale(1.6); } }
    .profile-link, .character-name, .loggedInStatus { filter: blur(6px); }`;
  document.head.append(style);
  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor';
  cursor.innerHTML = '<div class="ring"></div><svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.body.append(cursor);
  addEventListener('mousemove', (e) => (cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`), true);
  addEventListener('mousedown', () => { cursor.classList.remove('down'); void cursor.offsetWidth; cursor.classList.add('down'); }, true);
});

mkdirSync(OUT, { recursive: true });
const frames = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `${OUT}/f${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

let pos = { x: 760, y: 470 };
await page.mouse.move(pos.x, pos.y);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
async function moveTo(x, y) {
  const steps = Math.max(18, Math.round(Math.hypot(x - pos.x, y - pos.y) / 22));
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    await page.mouse.move(pos.x + (x - pos.x) * k, pos.y + (y - pos.y) * k);
    await sleep(12);
  }
  pos = { x, y };
}
async function center(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function click(locator, pause = 350) {
  const { x, y } = await center(locator);
  await moveTo(x, y);
  await sleep(120);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
  await sleep(pause);
}
async function type(text) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await sleep(70);
  }
}

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1 });
await sleep(900);

// 1. "+" on a mod of the first result adds it to the stat filters.
const mod = page.locator('#vue3-portal .resultset > .row[data-id] .item-mod--explicit').first();
const modCenter = await center(mod);
await moveTo(modCenter.x, modCenter.y);
await sleep(500);
await click(mod.locator('.ptm-mod-action--add'), 1300);

// 2. Quick filter: corrupted -> yes -> no.
const corrupted = page.locator('.ptm-qf__btn', { hasText: /corrupted/i }).first();
await click(corrupted, 450);
await click(corrupted, 900);

// 3. Search.
const fetched = page.waitForResponse((r) => r.url().includes('/api/trade2/fetch/'), { timeout: 20000 });
await click(page.locator('#trade .controls .search-btn'), 0);
await fetched;
await sleep(1600);

// 4. Bookmark it: new folder, then save the current search into it.
await click(page.locator('#ptm-root button', { hasText: /new folder/i }), 500);
await click(page.locator('#ptm-root .ptm-modal input[type="text"], #ptm-root .ptm-modal input:not([type])').first(), 200);
await type('Amulets');
await sleep(300);
await click(page.locator('#ptm-root .ptm-modal__footer button').first(), 700);
await click(page.locator('#ptm-root .ptm-bm-save button').first(), 600);
await sleep(400);
await click(page.locator('#ptm-root .ptm-modal__footer button').first(), 900);
const saved = page.locator('#ptm-root .ptm-bm-trade__title').first();
const s = await center(saved);
await moveTo(s.x, s.y);
await sleep(1800);

await cdp.send('Page.stopScreencast');
await sleep(200);

const lines = [];
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 1.2;
  lines.push(`file '${f.file}'`, `duration ${Math.max(0.02, next - f.t).toFixed(3)}`);
});
lines.push(`file '${frames.at(-1).file}'`);
writeFileSync(`${OUT}/frames.txt`, lines.join('\n') + '\n');
console.log(`${frames.length} frames, ${(frames.at(-1).t - frames[0].t).toFixed(1)}s -> ${OUT}/frames.txt`);
process.exit(0); // browser.close() would end the user's Chrome
