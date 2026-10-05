// Bundles src/main.tsx into a single userscript plus a .meta.js for cheap update checks.
// Usage: node build.mjs [--watch]
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const REPO_RAW = 'https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master';
const NAME = 'poe2-trade-monkey';

const metadata = [
  ['name', 'PoE2 Trade Monkey'],
  ['namespace', 'https://github.com/maluramichael/poe2-trade-monkey'],
  ['version', pkg.version],
  ['description', pkg.description],
  ['author', 'Michael Malura'],
  ['license', 'MIT'],
  ['homepageURL', 'https://github.com/maluramichael/poe2-trade-monkey'],
  ['supportURL', 'https://github.com/maluramichael/poe2-trade-monkey/issues'],
  ['icon', `${REPO_RAW}/assets/icon.png`],
  ['match', 'https://*.pathofexile.com/trade2*'],
  ['run-at', 'document-start'],
  ['grant', 'GM.getValue'],
  ['grant', 'GM.setValue'],
  ['grant', 'GM.deleteValue'],
  ['grant', 'GM.listValues'],
  ['grant', 'GM.xmlHttpRequest'],
  ['grant', 'GM.setClipboard'],
  ['grant', 'GM_addValueChangeListener'],
  ['grant', 'GM_removeValueChangeListener'],
  ['grant', 'unsafeWindow'],
  ['connect', 'poe.ninja'],
  ['updateURL', `${REPO_RAW}/dist/${NAME}.meta.js`],
  ['downloadURL', `${REPO_RAW}/dist/${NAME}.user.js`],
];

const width = Math.max(...metadata.map(([key]) => key.length)) + 2;
const header = [
  '// ==UserScript==',
  ...metadata.map(([key, value]) => `// @${key.padEnd(width)}${value}`),
  '// ==/UserScript==',
  '',
].join('\n');

const writeMetaFile = {
  name: 'meta-file',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      writeFileSync(`dist/${NAME}.meta.js`, header);
      console.log(`[build] ${NAME} ${pkg.version} written`);
    });
  },
};

mkdirSync('dist', { recursive: true });

/** The page-context script is bundled on its own and embedded as a string (see site/page). */
async function buildPageScript() {
  const result = await esbuild.build({
    entryPoints: ['src/site/page/index.ts'],
    bundle: true,
    format: 'iife',
    target: ['firefox115', 'chrome115'],
    write: false,
  });
  return result.outputFiles[0].text;
}

const pageScript = await buildPageScript();

const options = {
  entryPoints: ['src/main.tsx'],
  outfile: `dist/${NAME}.user.js`,
  bundle: true,
  format: 'iife',
  target: ['firefox115', 'chrome115'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'text', '.png': 'dataurl' },
  banner: { js: header },
  legalComments: 'none',
  charset: 'utf8',
  define: { __VERSION__: JSON.stringify(pkg.version), __PAGE_SCRIPT__: JSON.stringify(pageScript) },
  plugins: [writeMetaFile],
};

if (process.argv.includes('--watch')) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log('[build] watching src/ ...');
} else {
  await esbuild.build(options);
}
