#!/usr/bin/env node
/**
 * Vendor the standalone appliance cards' illustrations from
 * https://github.com/skyrotter/ha-appliance-electromenager-cards (MIT).
 *
 * These cards keep their SVG inline in the card module (with live values and
 * CSS animations), so instead of reimplementing them we render the upstream
 * demo page and screenshot the SVG element in its resting state.
 *
 * Usage: node scripts/import-card-art.mjs <path-to-cloned-repo>
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const source = process.argv[2] || process.env.DEVICE_ART_SOURCE;
if (!source) {
  console.error('Usage: node scripts/import-card-art.mjs <path-to-cloned-repo>');
  process.exit(1);
}

const root = path.resolve(source);
const demo = path.join(root, 'docs', 'demo.html');
const outDir = path.join(process.cwd(), 'public', 'device-art');

const kinds = [
  ['aquarium', 'aquarium'],
  ['battery', 'battery'],
  ['diesel-heater', 'diesel_heater'],
  ['ev-charger', 'ev_charger'],
  ['gas-boiler', 'gas_boiler'],
  ['jacuzzi', 'jacuzzi'],
  ['linky', 'linky'],
  ['pellet-boiler', 'pellet_boiler'],
  ['robot-mower-solo', 'robot_mower'],
  ['robot-vacuum-solo', 'robot_vacuum'],
  ['water-heat-pump', 'water_heat_pump'],
];

if (!fs.existsSync(demo)) {
  console.error(`Demo page not found: ${demo}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1400, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(`file:///${demo.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

// The demo can freeze its animations; the resulting screenshot is the resting
// state of each card (no spinning drums or moving mowers).
const freeze = page.locator('#anim button[data-v="0"]');
if (await freeze.count()) {
  await freeze.click();
  await page.waitForTimeout(500);
}

await page.addStyleTag({
  content:
    '#log, header, footer, .ctl { display: none !important; } html, body, #main, .cell { background: transparent !important; }',
});

const written = [];
for (const [kind, key] of kinds) {
  const svg = page.locator(`appliance-${kind}-card`).locator('svg').first();
  if ((await svg.count()) === 0) {
    console.warn(`warning: no svg for ${kind}`);
    continue;
  }
  await svg.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await svg.screenshot({ path: path.join(outDir, `${key}.png`), omitBackground: true });
  written.push(key);
}
await browser.close();

console.log(`Wrote ${written.length} card illustrations to ${outDir}`);
console.log(written.join(', '));
