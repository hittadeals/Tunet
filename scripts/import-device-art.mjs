#!/usr/bin/env node
/**
 * Vendor the appliance illustrations from
 * https://github.com/skyrotter/ha-appliance-electromenager-cards (MIT).
 *
 * The upstream repo keeps the SVGs as template strings that are concatenated
 * into a custom card bundle. This script evaluates those sources and writes
 * one self-contained SVG per appliance to public/device-art/.
 *
 * Usage: node scripts/import-device-art.mjs <path-to-cloned-repo>
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { chromium } from '@playwright/test';

const source = process.argv[2] || process.env.DEVICE_ART_SOURCE;
if (!source) {
  console.error('Usage: node scripts/import-device-art.mjs <path-to-cloned-repo>');
  process.exit(1);
}

const root = path.resolve(source);
const core = path.join(root, 'src', 'core');
const styleDir = path.join(core, 'style');
const svgDir = path.join(core, 'svg');
const outDir = path.join(process.cwd(), 'public', 'device-art');
const licensePath = path.join(root, 'LICENSE');

const svgFiles = fs
  .readdirSync(svgDir)
  .filter((file) => file.endsWith('.js'))
  .sort();

const sourceCode =
  [path.join(core, 'illustrations.js'), ...svgFiles.map((file) => path.join(svgDir, file))]
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n') + '\n;globalThis.__DEVICE_ART__ = SVG;';

const context = vm.createContext({ console });
vm.runInContext(sourceCode, context, { filename: 'device-art.js' });
const SVGs = context.__DEVICE_ART__;

const CSS_FOR = {
  washer: ['washer-dryer'],
  dryer: ['washer-dryer'],
  dishwasher: ['dishwasher'],
  water_heater: ['water-heater'],
  oven: ['oven-microwave'],
  microwave: ['oven-microwave'],
  radiator: ['radiator'],
  hob: ['cooktop'],
  vmc: ['vmc'],
  solar: ['solar'],
  chest_freezer: ['freezers'],
  drawer_freezer: ['freezers'],
  fridge: ['fridge', 'freezers'],
  printer_3d: ['printer-3d'],
  pool_pump: ['pool-pump'],
  pellet_stove: ['pellet-stove'],
  air_fryer: ['air-fryer'],
  coffee_maker: ['coffee-maker'],
  tv: ['tv'],
  range_hood: ['range-hood'],
  ac_split: ['ac-split'],
  heat_pump: ['heat-pump', 'ac-split'],
  towel_dryer: ['towel-dryer', 'laptop'],
  server_rack: ['server-rack'],
  desktop_pc: ['desktop-pc'],
  laptop: ['laptop', 'desktop-pc'],
  wine_cooler: ['wine-cooler'],
  beer_tap: ['beer-tap'],
  av_receiver: ['av-receiver'],
  fan: ['fan'],
  ceiling_fan: ['ceiling-fan'],
  generic: ['generic'],
  tool_charger: ['tool-charger'],
};

const sharedCss = fs.readFileSync(path.join(styleDir, 'illustration-shared.css'), 'utf8');
const cssFile = (name) => fs.readFileSync(path.join(styleDir, `${name}.css`), 'utf8');

// Freeze every illustration in its resting state: no intro overlays, no
// spinning drums and no marquee animations when shown as a static image.
const STATIC_CSS = '* { animation: none !important; transition: none !important; }\n';
const STATIC_OVERRIDES = {
  // A TV with the screen off is just a black rectangle; show the home screen
  // so the illustration reads as a TV at a glance.
  tv: '.tv-content { opacity: 1 !important; }\n',
};

const escapeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

fs.mkdirSync(outDir, { recursive: true });

const written = [];
for (const key of Object.keys(SVGs).sort()) {
  const build = SVGs[key];
  if (typeof build !== 'function') continue;
  const body = build();
  const cssParts = [
    STATIC_CSS,
    STATIC_OVERRIDES[key] || '',
    sharedCss,
    ...(CSS_FOR[key] || []).map(cssFile),
  ];
  const css = cssParts.join('\n');

  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140" preserveAspectRatio="xMidYMid meet" role="img">
<title>${key.replace(/_/g, ' ')}</title>
<style>${escapeStyle(css)}</style>
<g class="k-${key}">${body}</g>
</svg>
`;
  fs.writeFileSync(path.join(outDir, `${key}.svg`), markup);
  written.push(key);
}

if (fs.existsSync(licensePath)) {
  fs.writeFileSync(
    path.join(outDir, 'NOTICE.txt'),
    `Appliance illustrations in this directory are from
https://github.com/skyrotter/ha-appliance-electromenager-cards
and are licensed under the MIT License. The SVGs are vendored from the
upstream card sources (the original CSS is included inline so the
illustrations keep their resting appearance). The PNG files are screenshots of
the standalone cards in the upstream docs/demo.html, used for appliances that
only exist as self-contained cards (robot vacuum, EV charger, etc.).

${fs.readFileSync(licensePath, 'utf8')}`
  );
}

// Crop each illustration to its actual drawing. The upstream viewBox includes
// generous margins that make e.g. the wall-mounted TV tiny inside a square
// thumbnail. getBBox() needs a real layout engine, so use the already installed
// Playwright Chromium for the one-off import.
const browser = await chromium.launch();
const page = await browser.newPage();
for (const key of written) {
  const file = path.join(outDir, `${key}.svg`);
  const url = `file:///${file.replace(/\\/g, '/')}`;
  await page.goto(url);
  const box = await page.evaluate(() => {
    const group = document.querySelector('svg > g');
    if (!group) return null;
    const bbox = group.getBBox();
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  });
  if (!box || box.width <= 0 || box.height <= 0) continue;
  const padding = Math.max(2, Math.max(box.width, box.height) * 0.05);
  const width = Math.round(box.width + padding * 2);
  const height = Math.round(box.height + padding * 2);
  const viewBox = `${(box.x - padding).toFixed(2)} ${(box.y - padding).toFixed(2)} ${width} ${height}`;
  const markup = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(
    file,
    markup.replace(
      /<svg[^>]*>/,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="img">`
    )
  );
}
await browser.close();

console.log(`Wrote ${written.length} illustrations to ${outDir}`);
console.log(written.join(', '));
