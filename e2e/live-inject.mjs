// Dev loop against a real, logged-in browser attached via playwright-cli (see CLAUDE.md).
// Stores shim + built userscript in localStorage and installs a tiny loader once as init script,
// so every rebuild only needs: node e2e/live-inject.mjs > /tmp/inject.js && playwright-cli -s=poe run-code --filename=/tmp/inject.js
import { readFileSync } from 'node:fs';

const code = readFileSync('e2e/gm-shim.js', 'utf8') + '\n' + readFileSync('dist/poe2-trade-monkey.user.js', 'utf8');
const loader = `(() => { if (window.__ptmDevLoader) return; window.__ptmDevLoader = true;
  try { const code = localStorage.getItem('__ptm_dev_code'); if (code) (0, eval)(code); } catch (e) { console.error('[ptm-dev]', e); } })();`;

process.stdout.write(`async page => {
  await page.evaluate((code) => localStorage.setItem('__ptm_dev_code', code), ${JSON.stringify(code)});
  if (!(await page.evaluate(() => window.__ptmDevLoader === true))) {
    await page.context().addInitScript({ content: ${JSON.stringify(loader)} });
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ptm-root', { state: 'attached', timeout: 20000 });
  return 'injected';
}`);
