#!/usr/bin/env node
/**
 * Import the lamp illustrations from
 * https://github.com/skyrotter/ha-appliance-electromenager-cards (MIT).
 *
 * The upstream project keeps eleven lamp drawings as SVGs inside the lights
 * custom card. This script evaluates that source (without a browser or HA) and
 * freezes each drawing in its lit state, so `DeviceArtImage` can show it like
 * the appliance illustrations.
 *
 * Eight additional lamp types (table, arc, wall, track, linear pendant,
 * outdoor lantern, LED strip and night light) are drawn here in the same
 * visual language because the upstream set does not include them.
 *
 * Usage: node scripts/import-lamp-art.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { GALLERY_LAMPS } from './lamp-gallery.mjs';
import { GALLERY_LAMPS_2 } from './lamp-gallery-2.mjs';

const SOURCE_URL =
  'https://raw.githubusercontent.com/skyrotter/ha-appliance-electromenager-cards/main/src/cards/lights.js';
const OUT_DIR = path.join(process.cwd(), 'public', 'device-art');

const source = await fetch(SOURCE_URL).then((response) => {
  if (!response.ok) throw new Error(`Failed to fetch lamp art: ${response.status}`);
  return response.text();
});

const start = source.indexOf('const CSS =');
const end = source.indexOf('const PRESETS =');
if (start === -1 || end === -1 || end <= start) {
  throw new Error('Could not locate the lamp drawing definitions in the upstream source');
}

const sandbox = {};
vm.runInContext(
  `${source.slice(start, end)}\n;globalThis.__LIGHT_ART__ = { CSS, DEFS, SVGS, KINDS };`,
  vm.createContext(sandbox),
  { filename: 'lights.js' }
);

const { CSS, DEFS, SVGS, KINDS } = sandbox.__LIGHT_ART__;

const halo = (cx, cy, r, k = 0.55) =>
  `<circle class="lit halo lcf" cx="${cx}" cy="${cy}" r="${r}" style="--k:${k}" filter="url(#ltblur)"/>`;

/**
 * Extra drawings in the upstream style (same 200 × 180 canvas and gradients).
 * They only use the shared classes so they light up exactly like the imported
 * ones.
 */
const EXTRA_LAMPS = {
  table_lamp: () => `${halo(100, 84, 54, 0.5)}
    <path class="lit beam" d="M62 50 L46 0 L154 0 L138 50 Z" fill="url(#ltup)" style="--k:.45"/>
    <path class="lit beam" d="M64 106 L50 166 L150 166 L136 106 Z" fill="url(#ltcone)" style="--k:.55"/>
    <ellipse class="lit" cx="100" cy="166" rx="50" ry="5" fill="var(--lc)" style="--k:.4" filter="url(#ltsoft)"/>
    <path d="M100 106 V132" stroke="#9c7a3a" stroke-width="4"/>
    <path d="M90 132 Q100 146 110 132 L106 160 Q100 170 94 160 Z" fill="url(#ltbrass)"/>
    <ellipse cx="100" cy="164" rx="18" ry="4.5" fill="#6b4524"/>
    <path d="M62 50 L138 50 L150 106 L50 106 Z" fill="#e9e1d2"/>
    <path class="lit" d="M62 50 L138 50 L150 106 L50 106 Z" fill="url(#ltfill)" style="--k:.95"/>
    <path d="M62 50 L78 50 L66 106 L50 106 Z" fill="#000" fill-opacity=".1"/>
    <path d="M122 50 L138 50 L150 106 L134 106 Z" fill="#000" fill-opacity=".14"/>
    <path d="M62 50 L138 50 M50 106 L150 106" stroke="#c9bda7" stroke-width="1.5"/>`,

  arc_lamp: () => `${halo(152, 74, 36, 0.55)}
    <ellipse cx="54" cy="168" rx="28" ry="6" fill="url(#ltsteel)"/>
    <rect x="50" y="150" width="8" height="18" rx="2" fill="#7c838b"/>
    <path d="M54 152 C54 70 100 34 152 46" fill="none" stroke="url(#ltsteel)" stroke-width="4" stroke-linecap="round"/>
    <path d="M152 46 V66" stroke="#7c838b" stroke-width="3"/>
    <path class="lit beam" d="M132 78 L114 168 L188 168 L172 78 Z" fill="url(#ltcone)" style="--k:.6"/>
    <ellipse class="lit" cx="168" cy="168" rx="30" ry="5" fill="var(--lc)" style="--k:.45" filter="url(#ltsoft)"/>
    <path d="M132 76 A19 19 0 0 1 172 76 Z" fill="#4c555e"/>
    <path d="M132 76 A19 19 0 0 1 172 76 Z" fill="url(#ltglass)"/>
    <ellipse class="lit" cx="152" cy="76" rx="19" ry="4.5" fill="url(#ltfill)" style="--k:1"/>`,

  wall_sconce: () => `${halo(110, 88, 40, 0.55)}
    <rect x="24" y="24" width="34" height="132" rx="10" fill="#252b31"/>
    <rect x="40" y="76" width="16" height="40" rx="5" fill="url(#ltsteel)"/>
    <path d="M56 96 H84" stroke="url(#ltbrass)" stroke-width="5" stroke-linecap="round"/>
    <path class="lit beam" d="M86 66 L66 8 L154 8 L134 66 Z" fill="url(#ltup)" style="--k:.6"/>
    <path class="lit beam" d="M86 100 L72 152 L148 152 L134 100 Z" fill="url(#ltcone)" style="--k:.5"/>
    <path d="M84 66 L136 66 L148 100 L72 100 Z" fill="#e9e1d2"/>
    <path class="lit" d="M84 66 L136 66 L148 100 L72 100 Z" fill="url(#ltfill)" style="--k:.95"/>
    <path d="M84 66 L98 66 L88 100 L72 100 Z" fill="#000" fill-opacity=".1"/>
    <path d="M84 66 L136 66 M72 100 L148 100" stroke="#c9bda7" stroke-width="1.5"/>`,

  track_spotlight: () => {
    const spot = (x, angle) => `<g transform="translate(${x} 42) rotate(${angle})">
      <path d="M-11 0 H11 L15 32 H-15 Z" fill="#3f464d"/>
      <ellipse cx="0" cy="32" rx="15" ry="4.5" fill="url(#ltbezel)"/>
      <ellipse class="lit" cx="0" cy="32" rx="11" ry="3.2" fill="url(#ltfill)" style="--k:1"/>
      <path class="lit beam" d="M-12 36 L-22 96 L22 96 L12 36 Z" fill="url(#ltcone)" style="--k:.4"/>
    </g>`;
    return `<rect x="30" y="22" width="140" height="8" rx="4" fill="url(#ltsteel)"/>
      <rect x="58" y="30" width="8" height="8" fill="#7c838b"/>
      <rect x="96" y="30" width="8" height="8" fill="#7c838b"/>
      <rect x="134" y="30" width="8" height="8" fill="#7c838b"/>
      ${halo(62, 48, 24, 0.4)}${halo(100, 48, 24, 0.4)}${halo(138, 48, 24, 0.4)}
      ${spot(62, -14)}${spot(100, 0)}${spot(138, 14)}`;
  },

  linear_pendant: () => `${halo(100, 52, 48, 0.5)}
    <path d="M58 0 V36 M142 0 V36" stroke="#3a3f45" stroke-width="2"/>
    <rect x="42" y="36" width="116" height="10" rx="5" fill="url(#ltsteel)"/>
    <rect class="lit" x="38" y="46" width="124" height="5" rx="2.5" fill="url(#ltfill)" style="--k:1"/>
    <path class="lit beam" d="M46 54 L34 160 L166 160 L154 54 Z" fill="url(#ltcone)" style="--k:.5"/>
    <ellipse class="lit" cx="100" cy="160" rx="62" ry="6" fill="var(--lc)" style="--k:.35" filter="url(#ltsoft)"/>`,

  outdoor_lantern: () => `${halo(100, 96, 56, 0.5)}
    <rect x="6" y="0" width="18" height="180" fill="#252b31"/>
    <path d="M52 62 H148" stroke="url(#ltbrass)" stroke-width="4" stroke-linecap="round"/>
    <path d="M60 46 H140 L132 30 H68 Z" fill="#3f464d"/>
    <rect x="62" y="46" width="76" height="96" rx="4" fill="#3f464d"/>
    <rect class="lit" x="70" y="54" width="60" height="80" rx="2" fill="url(#ltfill)" style="--k:.85"/>
    <path d="M100 54 V134 M70 94 H130" stroke="#3f464d" stroke-width="3"/>
    <path d="M56 142 H144 L136 156 H64 Z" fill="url(#ltbrass)"/>
    <path class="lit beam" d="M72 150 L58 180 H142 L128 150 Z" fill="url(#ltcone)" style="--k:.45"/>`,

  led_strip: () => `${halo(100, 112, 62, 0.45)}
    <rect x="18" y="96" width="164" height="13" rx="3" fill="#3a3f45"/>
    <path d="M18 109 H182" stroke="#20252a" stroke-width="2"/>
    <rect class="lit" x="32" y="109" width="136" height="5" rx="2.5" fill="url(#ltfill)" style="--k:1"/>
    <path class="lit beam" d="M38 114 L28 170 L172 170 L162 114 Z" fill="url(#ltcone)" style="--k:.55"/>
    <ellipse class="lit" cx="100" cy="170" rx="68" ry="6" fill="var(--lc)" style="--k:.35" filter="url(#ltsoft)"/>`,

  night_light: () => `${halo(100, 84, 42, 0.5)}
    <rect x="62" y="96" width="76" height="74" rx="10" fill="#eef2f6"/>
    <rect x="72" y="106" width="56" height="54" rx="6" fill="#dde3e9"/>
    <circle cx="88" cy="132" r="3" fill="#9aa1a8"/><circle cx="112" cy="132" r="3" fill="#9aa1a8"/>
    <path d="M70 96 Q100 58 130 96 Z" fill="#e9e1d2"/>
    <path class="lit" d="M70 96 Q100 58 130 96 Z" fill="url(#ltfill)" style="--k:1"/>
    <path class="lit beam" d="M78 100 L64 160 L136 160 L122 100 Z" fill="url(#ltcone)" style="--k:.45"/>
    <ellipse class="lit" cx="100" cy="162" rx="40" ry="5" fill="var(--lc)" style="--k:.3" filter="url(#ltsoft)"/>`,
};

const STATIC_CSS = '* { animation: none !important; transition: none !important; }\n';
const escapeStyle = (css) => css.replace(/<\/style/gi, '<\\/style');

const buildSvg = (kind, body, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180" preserveAspectRatio="xMidYMid meet" role="img" style="--lc:${color};--b:1">
<title>${kind.replace(/_/g, ' ')}</title>
<style>${escapeStyle(STATIC_CSS + CSS)}</style>
${DEFS}
<g class="on">${body}</g>
</svg>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });

const written = [];
for (const kind of Object.keys(SVGS)) {
  if (typeof SVGS[kind] !== 'function') continue;
  const color = KINDS?.[kind]?.color || '#ffc46b';
  fs.writeFileSync(path.join(OUT_DIR, `${kind}.svg`), buildSvg(kind, SVGS[kind]({}), color));
  written.push(kind);
}

for (const [kind, draw] of Object.entries({
  ...EXTRA_LAMPS,
  ...GALLERY_LAMPS,
  ...GALLERY_LAMPS_2,
})) {
  fs.writeFileSync(path.join(OUT_DIR, `${kind}.svg`), buildSvg(kind, draw(), '#ffc46b'));
  written.push(kind);
}

// Keep the license next to the imported files.
const license = await fetch(
  'https://raw.githubusercontent.com/skyrotter/ha-appliance-electromenager-cards/main/LICENSE'
).then((response) => (response.ok ? response.text() : ''));
if (license) {
  fs.writeFileSync(
    path.join(OUT_DIR, 'lights-NOTICE.txt'),
    `Lamp illustrations in this directory (light_bulb, color_bulb, filament_bulb,
pendant_light, pendant_cluster, desk_lamp, floor_lamp, chandelier,
garden_spotlight, ceiling_spot, christmas_tree) are from
https://github.com/skyrotter/ha-appliance-electromenager-cards and are
licensed under the MIT License. The SVGs are frozen from the upstream custom
card sources in their lit state.

All other lamp illustrations in this directory were drawn for Tunet in the
same visual style and are covered by the project license.

${license}`
  );
}

console.log(`Wrote ${written.length} lamp illustrations to ${OUT_DIR}`);
console.log(written.join(', '));
