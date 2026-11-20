#!/usr/bin/env node
/**
 * Vendor the device drawings from https://github.com/almulder/ha-device-art (MIT).
 *
 * The upstream project ships a browser bundle that renders every drawing as an
 * SVG string. This script evaluates that bundle in Chromium and writes a lit and
 * an unlit SVG for each drawing to public/device-art/ha/, plus a generated config
 * module that registers the drawings in the illustration picker.
 *
 * Usage:
 *   node scripts/import-ha-device-art.mjs              # lights + common appliances
 *   node scripts/import-ha-device-art.mjs --all        # every drawing except plants/home/people
 *   node scripts/import-ha-device-art.mjs --per-sub=5  # more appliance variants per group
 *   node scripts/import-ha-device-art.mjs --check      # list what would be imported
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const REPO = 'almulder/ha-device-art';
const COMMIT = '873cca822c4e5010ead74a91405ab1572a9e9d18';
const VERSION = '1.3.3';
const OUT_DIR = path.join(process.cwd(), 'public', 'device-art', 'ha');
const CONFIG_FILE = path.join(process.cwd(), 'src', 'config', 'haDeviceArt.generated.js');

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const CHECK = args.includes('--check');
const perSubArg = args.find((arg) => arg.startsWith('--per-sub='));
const PER_SUB = perSubArg ? Math.max(1, Number(perSubArg.split('=')[1]) || 3) : 3;

const EXCLUDED_CATEGORIES = new Set(['plants', 'home', 'people']);

// Upstream category/sub-group -> the picker groups Tunet already uses.
const CATEGORY_MAP = {
  lighting: {
    ceiling: 'ceiling',
    pendants: 'pendants',
    chandeliers: 'pendants',
    wall: 'wall',
    spots: 'ceiling',
    cabinet: 'strips',
    chickenlamps: 'table',
    bulbs: 'bulbs',
    mirror: 'wall',
    special: 'strips',
  },
  lamps: {
    floor: 'floor',
    desk: 'table',
    nightstand: 'table',
    strips: 'strips',
    neon: 'strips',
    holiday: 'strips',
  },
  outdoor: { lights: 'outdoor' },
};

// Always include at least one drawing for the appliances people expect to see.
const FEATURED = [
  'laundrycfg/cfgscreen',
  'kitchen2/12-cup-drip-maker',
  'smallkitchen/espresso',
  'smallkitchen/pod',
  'dishwasher/front',
  'fridgecfg/steel',
  'rangecfg/cfg-classic',
  'microwave/counter',
  'range/steam',
  'vacuum/lidar',
  'vacuum/mower',
  'floorcare/laser-stick-vacuum',
  'energy/round',
  'media/wall-tv',
  'speakers2/tall-cylinder-speaker',
  'thermostat/learning',
  'ac/minisplit',
  'purifier/cylinder',
  'humidifier/cleartank',
  'water/elec',
  'heating/combi',
  'energy/roof',
  'ceilingfan/classic',
  'standfan/classic',
  'towerfan/classic',
  'security/dome',
  'lock/keypad',
  'doorbell/brass',
  'switch/paddle-rocker',
  'plug/mini',
  'outlets/duplex',
];

const fetchText = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.text();
};

const raw = (file) => `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${file}`;

const [catalogText, bundle, license] = await Promise.all([
  fetchText(raw('src/catalog.json')),
  fetchText(raw('dist/ha-device-art.js')),
  fetchText(raw('LICENSE')),
]);

const catalog = JSON.parse(catalogText);

const isLighting = (category, sub) =>
  category.id === 'lighting' ||
  category.id === 'lamps' ||
  (category.id === 'outdoor' && sub.id === 'lights');

const pickerCategory = (categoryId, subId) =>
  CATEGORY_MAP[categoryId]?.[subId] || 'appliances';

const selected = [];
const seen = new Set();
for (const category of catalog) {
  if (EXCLUDED_CATEGORIES.has(category.id)) continue;
  for (const sub of category.subs) {
    const items = ALL || isLighting(category, sub) ? sub.items : sub.items.slice(0, PER_SUB);
    for (const sourceId of items) {
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);
      selected.push({
        sourceId,
        set: sourceId.split('/')[0],
        category: isLighting(category, sub) ? pickerCategory(category.id, sub.id) : 'appliances',
        upstreamCategory: category.id,
        upstreamSub: sub.id,
      });
    }
  }
}
for (const sourceId of FEATURED) {
  if (seen.has(sourceId)) continue;
  const category = catalog.find((entry) =>
    entry.subs.some((sub) => sub.items.includes(sourceId))
  );
  const sub = category?.subs.find((entry) => entry.items.includes(sourceId));
  if (!category || !sub) continue;
  seen.add(sourceId);
  selected.push({
    sourceId,
    set: sourceId.split('/')[0],
    category: pickerCategory(category.id, sub.id),
    upstreamCategory: category.id,
    upstreamSub: sub.id,
  });
}

const fileFor = (sourceId) =>
  sourceId
    .replace('/', '_')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

const keyFor = (sourceId) => `hda_${fileFor(sourceId)}`;

if (CHECK) {
  const byCategory = {};
  selected.forEach((entry) => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  });
  console.log(`${selected.length} drawings (${Object.keys(selected).length} keys)`);
  console.log(byCategory);
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: bundle });

const rendered = [];
const CHUNK = 80;
for (let index = 0; index < selected.length; index += CHUNK) {
  const chunk = selected.slice(index, index + CHUNK).map((entry) => entry.sourceId);
  const result = await page.evaluate(
    ({ ids, screenshot }) => {
      const tag = screenshot ? 'shot' : 'raw';
      void tag;
      return ids.map((id) => {
        const item = window.DeviceArt.items[id];
        const render = (on) =>
          window.DeviceArt.render(id, { on, anim: false, bg: false });
        return {
          sourceId: id,
          name: item?.name || id.split('/').pop(),
          on: render(true),
          off: render(false),
        };
      });
    },
    { ids: chunk, screenshot: false }
  );
  rendered.push(...result);
  process.stdout.write(`\rRendered ${Math.min(index + CHUNK, selected.length)}/${selected.length}`);
}
process.stdout.write('\n');
await browser.close();

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const file of fs.readdirSync(OUT_DIR)) {
  if (file.endsWith('.svg')) fs.unlinkSync(path.join(OUT_DIR, file));
}

const minify = (svg) => svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
// The upstream card hides scenery by toggling a class on its wrapper. These
// files are used as standalone <img> sources, so hide the scenery inside the SVG.
const withStaticStyles = (svg) =>
  minify(svg).replace(/^(<svg[^>]*>)/, '$1<style>.hda-bg{display:none}</style>');
const entries = [];
for (const entry of selected) {
  const art = rendered.find((item) => item.sourceId === entry.sourceId);
  if (!art || !art.on) continue;
  const file = fileFor(entry.sourceId);
  fs.writeFileSync(path.join(OUT_DIR, `${file}-on.svg`), withStaticStyles(art.on) + '\n');
  fs.writeFileSync(path.join(OUT_DIR, `${file}-off.svg`), withStaticStyles(art.off) + '\n');
  entries.push({
    key: keyFor(entry.sourceId),
    sourceId: entry.sourceId,
    file,
    label: art.name,
    category: entry.category,
  });
}
entries.sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key));

const config = `// Generated by scripts/import-ha-device-art.mjs. Do not edit by hand.
// Drawings from https://github.com/${REPO} (MIT), version ${VERSION}.
const ROWS = ${JSON.stringify(
  entries.map((entry) => [entry.key, entry.file, entry.label, entry.category, entry.sourceId])
)};

export const HA_DEVICE_ART = ROWS.map(([key, file, label, category, sourceId]) => ({
  key,
  file,
  label,
  category,
  sourceId,
  variants: true,
  asset: 'svg',
  keywords: [],
}));
`;

fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
fs.writeFileSync(CONFIG_FILE, config);

fs.writeFileSync(
  path.join(OUT_DIR, 'NOTICE.txt'),
  `Device drawings in this directory are from
https://github.com/${REPO}
(commit ${COMMIT}, version ${VERSION}) and are licensed under the MIT License.
They were rendered to standalone SVGs in their lit (${'-on'}) and unlit (${'-off'})
states with the upstream scenery disabled.

${license}`
);

const totalBytes = fs
  .readdirSync(OUT_DIR)
  .filter((file) => file.endsWith('.svg'))
  .reduce((sum, file) => sum + fs.statSync(path.join(OUT_DIR, file)).size, 0);

console.log(
  `Wrote ${entries.length} drawings (${entries.length * 2} SVGs, ${(totalBytes / 1048576).toFixed(1)} MB) to ${path.relative(process.cwd(), OUT_DIR)}`
);
console.log(`Wrote ${path.relative(process.cwd(), CONFIG_FILE)}`);
