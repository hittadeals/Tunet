/**
 * Second batch of lamp illustrations drawn for Tunet in the same visual
 * language as the imported MIT set. Written by `scripts/import-lamp-art.mjs`.
 */

const halo = (cx, cy, r, k = 0.5) =>
  `<circle class="lit halo lcf" cx="${cx}" cy="${cy}" r="${r}" style="--k:${k}" filter="url(#ltblur)"/>`;

const rod = (x1, y1, x2, y2, color = '#3a3f45', width = 1.8) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

const rose = (x, y, w = 16, fill = 'url(#ltbrass)') =>
  `<rect x="${x - w / 2}" y="${y}" width="${w}" height="9" rx="3" fill="${fill}"/>`;

const orb = (x, y, r, k = 1) => `${halo(x, y, r * 2.1, 0.5)}
  <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".35"/>
  <circle class="lit" cx="${x}" cy="${y}" r="${r}" fill="url(#ltfill)" style="--k:${k}"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#ltglass)"/>`;

const cone = (cx, top, bottom, halfTop, halfBottom, k = 0.5) =>
  `<path class="lit beam" d="M${cx - halfTop} ${top} L${cx - halfBottom} ${bottom} L${cx + halfBottom} ${bottom} L${cx + halfTop} ${top} Z" fill="url(#ltcone)" style="--k:${k}"/>`;

const floorGlow = (cx, y, rx, k = 0.32) =>
  `<ellipse class="lit" cx="${cx}" cy="${y}" rx="${rx}" ry="6" fill="var(--lc)" style="--k:${k}" filter="url(#ltsoft)"/>`;

const lit = (d, k = 0.95) => `<path class="lit" d="${d}" fill="url(#ltfill)" style="--k:${k}"/>`;

const STEEL = 'url(#ltsteel)';
const BRASS = 'url(#ltbrass)';
const BLACK = '#3f464d';
const WHITE = '#e9e1d2';
const CREAM = '#f3efe6';
const SAND = '#d8cbb8';

const dome = (cx, cy, rx, ry, fill) =>
  `<path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Z" fill="${fill}"/>`;
const domeLit = (cx, cy, rx, ry, k = 0.9) =>
  lit(`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Z`, k);

const coneShade = (cx, top, halfTop, bottom, halfBottom, fill) =>
  `<path d="M${cx - halfTop} ${top} H${cx + halfTop} L${cx + halfBottom} ${bottom} H${cx - halfBottom} Z" fill="${fill}"/>`;

const bellShade = (cx, top, halfTop, bottom, halfBottom, fill) =>
  `<path d="M${cx - halfTop} ${top} H${cx + halfTop} L${cx + halfBottom} ${bottom} Q${cx} ${bottom + 12} ${cx - halfBottom} ${bottom} Z" fill="${fill}"/>`;

const drum = (cx, top, halfW, h, fill, r = 6) =>
  `<rect x="${cx - halfW}" y="${top}" width="${halfW * 2}" height="${h}" rx="${r}" fill="${fill}"/>`;

const disc = (cx, cy, rx, ry, fill) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;

const tripod = (cx, topY, baseY, color = '#b07a46') =>
  `<path d="M${cx} ${topY} L${cx - 34} ${baseY} M${cx} ${topY} L${cx + 34} ${baseY} M${cx} ${topY} L${cx + 2} ${baseY - 2}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;

export const GALLERY_LAMPS_2 = {
  // ── Pendants ──────────────────────────────────────────────────────────────
  pendant_globe_brass: () => `${rod(100, 0, 100, 40, BRASS, 2)}${rose(100, 34, 14, BRASS)}
    ${orb(100, 82, 25)}
    ${cone(100, 108, 168, 10, 36, 0.38)}
    ${floorGlow(100, 168, 38)}`,

  pendant_globe_black: () => `${rod(100, 0, 100, 44, BLACK, 2)}${rose(100, 38, 14, BLACK)}
    ${orb(100, 86, 23, 0.85)}
    ${cone(100, 110, 166, 9, 34, 0.32)}
    ${floorGlow(100, 168, 34, 0.28)}`,

  pendant_twin_globe: () => `${rod(100, 0, 100, 28, BRASS, 2)}
    <path d="M76 30 H124" stroke="${BRASS}" stroke-width="4" stroke-linecap="round"/>
    ${rod(76, 30, 76, 54, BRASS, 1.6)}${rod(124, 30, 124, 54, BRASS, 1.6)}
    ${orb(76, 76, 17)}${orb(124, 76, 17)}
    ${floorGlow(100, 168, 46, 0.24)}`,

  pendant_triple_globe: () => `<rect x="46" y="26" width="108" height="6" rx="3" fill="${BRASS}"/>
    ${rod(100, 0, 100, 26, BRASS, 2)}
    ${[
      [70, 58, 12],
      [100, 50, 13],
      [130, 60, 12],
    ]
      .map(([x, y, r]) => `${rod(x, 32, x, y - 10, BRASS, 1.4)}${orb(x, y, r, 0.9)}`)
      .join('')}
    ${floorGlow(100, 168, 52, 0.22)}`,

  pendant_cascade: () => `<rect x="44" y="24" width="112" height="5" rx="2.5" fill="${BRASS}"/>
    ${rod(100, 0, 100, 24, BRASS, 2)}
    ${[
      [58, 48],
      [78, 62],
      [98, 76],
      [118, 94],
      [138, 112],
    ]
      .map(([x, y], i) => `${rod(x, 29, x, y - 8, '#3a3f45', 1.3)}${orb(x, y, 9, 0.85 - i * 0.05)}`)
      .join('')}
    ${floorGlow(100, 168, 58, 0.18)}`,

  pendant_cage: () => `${rod(100, 0, 100, 34, BLACK, 2)}${rose(100, 28, 14, BLACK)}
    ${halo(100, 88, 54, 0.45)}
    ${orb(100, 88, 18, 0.9)}
    <g fill="none" stroke="${BLACK}" stroke-width="1.8">
      <ellipse cx="100" cy="88" rx="30" ry="34"/>
      <path d="M100 54 V122 M76 66 Q100 88 124 66 M76 110 Q100 88 124 110 M70 88 H130"/>
    </g>
    ${cone(100, 122, 166, 8, 30, 0.26)}
    ${floorGlow(100, 168, 30, 0.2)}`,

  pendant_halo: () => `${rod(100, 0, 100, 40, BLACK, 1.6)}
    <circle cx="100" cy="80" r="40" fill="none" stroke="${STEEL}" stroke-width="5"/>
    <circle class="lit" cx="100" cy="80" r="39" fill="none" stroke="#ffe2b0" stroke-width="4" style="--k:1"/>
    ${halo(100, 80, 70, 0.4)}
    ${cone(100, 84, 166, 22, 48, 0.28)}
    ${floorGlow(100, 168, 42, 0.24)}`,

  pendant_wide_drum: () => `${rod(100, 0, 100, 36, BLACK, 2)}${rose(100, 30, 16, BLACK)}
    ${drum(100, 40, 62, 34, WHITE, 7)}
    ${lit('M38 44 H162 V70 H38 Z', 0.9)}
    <path d="M38 40 H162" stroke="#c9bda7" stroke-width="2"/>
    ${cone(100, 76, 158, 30, 58, 0.4)}
    ${floorGlow(100, 160, 54, 0.26)}`,

  pendant_cone_black: () => `${rod(100, 0, 100, 34, BLACK, 2)}${rose(100, 28, 14, BLACK)}
    ${coneShade(100, 36, 22, 100, 48, BLACK)}
    ${domeLit(100, 100, 47, 6, 1)}
    ${cone(100, 104, 166, 26, 52, 0.42)}
    ${floorGlow(100, 168, 46, 0.26)}`,

  pendant_bell_white: () => `${rod(100, 0, 100, 32, BRASS, 2)}${rose(100, 26, 14)}
    ${bellShade(100, 34, 14, 96, 48, WHITE)}
    ${domeLit(100, 96, 46, 6, 1)}
    ${cone(100, 102, 164, 24, 50, 0.4)}
    ${floorGlow(100, 166, 44, 0.24)}`,

  pendant_cylinder_brass: () => `${rod(100, 0, 100, 38, BRASS, 2)}${rose(100, 32, 16, BRASS)}
    ${drum(100, 42, 30, 56, BRASS, 4)}
    <path d="M78 54 H122 M78 68 H122 M78 82 H122" stroke="#7b521b" stroke-width="1.4" opacity=".7"/>
    ${domeLit(100, 98, 29, 5, 1)}
    ${cone(100, 102, 164, 16, 38, 0.32)}
    ${floorGlow(100, 166, 34, 0.22)}`,

  pendant_double_cone: () => `<rect x="56" y="28" width="88" height="6" rx="3" fill="${BRASS}"/>
    ${rod(100, 0, 100, 28, BRASS, 2)}
    ${[
      [76, 34],
      [124, 34],
    ]
      .map(
        ([x, y]) => `${rod(x, 34, x, y + 20, BLACK, 1.4)}
      ${coneShade(x, 54, 10, 92, 22, BLACK)}
      ${domeLit(x, 92, 21, 4, 1)}
      ${cone(x, 96, 156, 12, 26, 0.28)}`
      )
      .join('')}
    ${floorGlow(100, 158, 46, 0.2)}`,

  // ── Ceiling ───────────────────────────────────────────────────────────────
  ceiling_dome_black: () => `${disc(100, 34, 44, 8, STEEL)}
    ${dome(100, 34, 40, 40, BLACK)}
    ${domeLit(100, 34, 36, 34, 0.85)}
    ${halo(100, 54, 54, 0.4)}
    ${cone(100, 58, 166, 20, 46, 0.28)}
    ${floorGlow(100, 168, 44, 0.24)}`,

  ceiling_dome_brass: () => `${disc(100, 34, 42, 8, BRASS)}
    ${dome(100, 34, 38, 38, BRASS)}
    ${domeLit(100, 34, 34, 32, 0.9)}
    ${halo(100, 54, 52, 0.4)}
    ${cone(100, 58, 166, 18, 44, 0.28)}
    ${floorGlow(100, 168, 42, 0.24)}`,

  ceiling_square_white: () => `<rect x="52" y="26" width="96" height="26" rx="4" fill="${WHITE}"/>
    <rect class="lit" x="58" y="32" width="84" height="14" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    ${cone(100, 52, 162, 24, 50, 0.28)}
    ${floorGlow(100, 166, 44, 0.22)}`,

  ceiling_round_micro: () => `${disc(100, 42, 26, 8, STEEL)}
    <circle cx="100" cy="42" r="24" fill="${BLACK}"/>
    <circle class="lit" cx="100" cy="42" r="19" fill="url(#ltspot)" style="--k:1"/>
    ${halo(100, 42, 40, 0.35)}
    ${cone(100, 52, 150, 10, 28, 0.22)}
    ${floorGlow(100, 154, 26, 0.18)}`,

  ceiling_triple_spot: () => `<rect x="46" y="20" width="108" height="7" rx="3.5" fill="${STEEL}"/>
    ${[70, 100, 130]
      .map(
        (x) => `${rod(x, 27, x, 40, STEEL, 3)}
      <ellipse cx="${x}" cy="44" rx="13" ry="5" fill="url(#ltbezel)"/>
      <ellipse class="lit" cx="${x}" cy="44" rx="10" ry="3.5" fill="url(#ltfill)" style="--k:1"/>
      ${cone(x, 48, 140, 8, 22, 0.25)}`
      )
      .join('')}
    ${floorGlow(100, 146, 50, 0.2)}`,

  ceiling_twin_bar: () => `<rect x="58" y="24" width="84" height="7" rx="3.5" fill="${STEEL}"/>
    ${[78, 122]
      .map(
        (x) => `<path d="M${x - 9} 31 H${x + 9} V48 H${x - 9} Z" fill="${BLACK}"/>
      <ellipse class="lit" cx="${x}" cy="48" rx="8" ry="3" fill="url(#ltfill)" style="--k:1"/>
      ${cone(x, 52, 140, 7, 20, 0.24)}`
      )
      .join('')}
    ${floorGlow(100, 146, 42, 0.18)}`,

  ceiling_oval: () => `${disc(100, 38, 60, 12, WHITE)}
    ${disc(100, 40, 54, 9, CREAM)}
    ${lit('M46 40 A54 9 0 0 1 154 40 A54 9 0 0 1 46 40 Z', 0.85)}
    ${cone(100, 50, 160, 30, 60, 0.26)}
    ${floorGlow(100, 166, 54, 0.22)}`,

  // ── Wall ──────────────────────────────────────────────────────────────────
  wall_sconce_brass: () => `<rect x="30" y="30" width="30" height="120" rx="10" fill="#252b31"/>
    <rect x="44" y="76" width="16" height="38" rx="5" fill="${BRASS}"/>
    ${rod(60, 95, 84, 95, BRASS, 5)}
    ${dome(110, 92, 30, 28, BRASS)}
    ${domeLit(110, 92, 27, 25, 0.9)}
    ${halo(110, 88, 42, 0.42)}
    ${cone(110, 96, 158, 18, 40, 0.34)}
    ${floorGlow(110, 164, 34, 0.2)}`,

  wall_sconce_black: () => `<rect x="30" y="30" width="30" height="120" rx="10" fill="#252b31"/>
    <rect x="44" y="76" width="16" height="38" rx="5" fill="${STEEL}"/>
    ${rod(60, 95, 84, 95, BLACK, 5)}
    ${coneShade(110, 66, 12, 96, 30, BLACK)}
    ${domeLit(110, 96, 29, 5, 1)}
    ${cone(110, 100, 160, 18, 38, 0.36)}
    ${floorGlow(110, 164, 32, 0.2)}`,

  wall_updown_round: () => `<circle cx="100" cy="88" r="34" fill="${STEEL}"/>
    <circle class="lit" cx="100" cy="88" r="27" fill="url(#ltspot)" style="--k:1"/>
    <path d="M100 62 V114" stroke="${BLACK}" stroke-width="2" opacity=".5"/>
    ${halo(100, 88, 54, 0.45)}
    <path class="lit beam" d="M78 62 L64 8 L136 8 L122 62 Z" fill="url(#ltup)" style="--k:.5"/>
    ${cone(100, 116, 168, 24, 46, 0.3)}
    ${floorGlow(100, 168, 40, 0.2)}`,

  wall_candle: () => `<rect x="34" y="70" width="12" height="46" rx="4" fill="${STEEL}"/>
    <path d="M46 88 C70 88 70 64 94 64 M46 88 C70 88 70 112 94 112" fill="none" stroke="${BRASS}" stroke-width="4" stroke-linecap="round"/>
    ${[
      [94, 64],
      [94, 112],
    ]
      .map(
        ([x, y]) => `<rect x="${x - 4}" y="${y}" width="8" height="18" rx="1.5" fill="${CREAM}"/>
      ${halo(x, y - 6, 18, 0.4)}
      <path class="lit" d="M${x} ${y - 10} C${x + 5} ${y - 3} ${x + 5} ${y + 2} ${x} ${y + 2} C${x - 5} ${y + 2} ${x - 5} ${y - 3} ${x} ${y - 10} Z" fill="url(#ltfill)" style="--k:1"/>`
      )
      .join('')}
    ${floorGlow(100, 168, 34, 0.2)}`,

  wall_swing: () => `<rect x="34" y="94" width="11" height="52" rx="4" fill="${STEEL}"/>
    <path d="M45 110 H72 L96 88" fill="none" stroke="${STEEL}" stroke-width="4" stroke-linecap="round"/>
    ${dome(112, 84, 24, 24, WHITE)}
    ${domeLit(112, 84, 21, 21, 0.9)}
    ${halo(112, 82, 34, 0.38)}
    ${cone(112, 92, 150, 14, 32, 0.32)}
    ${floorGlow(112, 158, 28, 0.18)}`,

  wall_linear_updown: () => `<rect x="82" y="46" width="36" height="74" rx="6" fill="${STEEL}"/>
    <rect class="lit" x="89" y="52" width="22" height="26" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    <rect class="lit" x="89" y="88" width="22" height="26" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    ${halo(100, 84, 42, 0.38)}
    <path class="lit beam" d="M90 48 L76 6 L124 6 L110 48 Z" fill="url(#ltup)" style="--k:.45"/>
    ${cone(100, 120, 166, 14, 34, 0.36)}
    ${floorGlow(100, 168, 30, 0.2)}`,

  wall_globe: () => `<rect x="34" y="66" width="11" height="44" rx="4" fill="${STEEL}"/>
    ${rod(45, 88, 64, 88, BRASS, 4)}
    ${orb(88, 88, 24)}
    ${cone(88, 114, 160, 10, 30, 0.28)}
    ${floorGlow(88, 164, 28, 0.18)}`,

  // ── Floor ─────────────────────────────────────────────────────────────────
  floor_arc_brass: () => `${disc(50, 168, 28, 6, BRASS)}
    <path d="M50 164 C50 66 100 30 152 44" fill="none" stroke="${BRASS}" stroke-width="4" stroke-linecap="round"/>
    ${rod(152, 44, 152, 64, BRASS, 3)}
    ${dome(152, 74, 20, 20, BRASS)}
    ${domeLit(152, 74, 18, 18, 0.9)}
    ${halo(152, 72, 32, 0.36)}
    ${cone(152, 82, 168, 12, 34, 0.3)}
    ${floorGlow(158, 168, 32, 0.2)}`,

  floor_arc_black: () => `${disc(50, 168, 28, 6, STEEL)}
    <path d="M50 164 C50 66 100 30 152 44" fill="none" stroke="${BLACK}" stroke-width="4" stroke-linecap="round"/>
    ${rod(152, 44, 152, 64, BLACK, 3)}
    ${coneShade(152, 64, 8, 96, 24, BLACK)}
    ${domeLit(152, 96, 23, 4, 1)}
    ${cone(152, 100, 168, 12, 30, 0.28)}
    ${floorGlow(152, 168, 30, 0.18)}`,

  floor_tripod_white: () => `${tripod(100, 108, 170, SAND)}
    ${halo(100, 86, 56, 0.4)}
    ${drum(100, 48, 48, 60, WHITE, 7)}
    ${lit('M56 52 H144 V102 H56 Z', 0.88)}
    <path d="M56 48 H144" stroke="#c9bda7" stroke-width="2"/>
    ${cone(100, 110, 168, 28, 54, 0.34)}
    ${floorGlow(100, 168, 48, 0.22)}`,

  floor_drum_tall: () => `${disc(100, 168, 24, 6, STEEL)}
    ${rod(100, 168, 100, 116, STEEL, 4)}
    ${drum(100, 40, 38, 78, SAND, 6)}
    ${lit('M66 44 H134 V114 H66 Z', 0.85)}
    <path d="M66 40 H134" stroke="#b9ab94" stroke-width="2"/>
    ${cone(100, 118, 168, 24, 46, 0.3)}
    ${floorGlow(100, 168, 44, 0.2)}`,

  floor_globe_brass: () => `${disc(100, 168, 26, 6, BRASS)}
    ${rod(100, 168, 100, 100, BRASS, 4)}
    ${orb(100, 72, 28)}
    ${cone(100, 100, 168, 10, 38, 0.3)}
    ${floorGlow(100, 168, 42, 0.24)}`,

  floor_twig_white: () => `${disc(100, 168, 22, 6, STEEL)}
    <path d="M100 166 C94 128 80 96 66 58 M100 166 C100 126 100 96 100 42 M100 166 C106 128 120 96 134 58 M100 166 C94 140 88 128 82 114 M100 166 C106 140 112 128 118 114"
      fill="none" stroke="${STEEL}" stroke-width="2.6" stroke-linecap="round"/>
    ${[
      [66, 54, 9],
      [100, 38, 10],
      [134, 54, 9],
      [82, 110, 7],
      [118, 110, 7],
    ]
      .map(([x, y, r]) => orb(x, y, r, 0.9))
      .join('')}
    ${floorGlow(100, 168, 44, 0.2)}`,

  floor_torchiere: () => `${disc(100, 168, 24, 6, BRASS)}
    ${rod(100, 168, 100, 100, BRASS, 4)}
    ${coneShade(100, 60, 26, 104, 14, BRASS)}
    ${domeLit(100, 62, 25, 5, 0.9)}
    <path class="lit beam" d="M86 58 L64 4 L136 4 L114 58 Z" fill="url(#ltup)" style="--k:.6"/>
    ${halo(100, 56, 48, 0.35)}
    ${floorGlow(100, 168, 38, 0.18)}`,

  // ── Table ─────────────────────────────────────────────────────────────────
  table_ceramic_white: () => `<path d="M88 132 Q88 152 78 168 H122 Q112 152 112 132 Z" fill="${WHITE}"/>
    ${disc(100, 166, 23, 5, '#c9bda7')}
    ${rod(100, 132, 100, 120, '#c9bda7', 4)}
    ${drum(100, 66, 38, 54, WHITE, 7)}
    ${lit('M66 70 H134 V116 H66 Z', 0.88)}
    <path d="M66 66 H134" stroke="#c9bda7" stroke-width="2"/>
    ${halo(100, 92, 46, 0.36)}
    ${cone(100, 122, 166, 22, 42, 0.28)}
    ${floorGlow(100, 168, 36, 0.18)}`,

  table_ceramic_black: () => `<path d="M88 132 Q88 152 78 168 H122 Q112 152 112 132 Z" fill="${BLACK}"/>
    ${disc(100, 166, 23, 5, '#2a2f35')}
    ${rod(100, 132, 100, 120, BLACK, 4)}
    ${drum(100, 66, 38, 54, BLACK, 7)}
    ${lit('M68 70 H132 V116 H68 Z', 0.85)}
    ${halo(100, 92, 44, 0.34)}
    ${cone(100, 122, 166, 22, 40, 0.26)}
    ${floorGlow(100, 168, 34, 0.16)}`,

  table_mushroom: () => `${disc(100, 162, 24, 6, STEEL)}
    ${rod(100, 162, 100, 116, STEEL, 5)}
    ${dome(100, 116, 52, 34, WHITE)}
    ${domeLit(100, 116, 48, 30, 0.9)}
    <path d="M48 116 H152" stroke="#c9bda7" stroke-width="2"/>
    ${halo(100, 112, 50, 0.38)}
    ${cone(100, 120, 162, 28, 50, 0.28)}
    ${floorGlow(100, 166, 40, 0.18)}`,

  table_globe: () => `${disc(100, 166, 22, 5, BRASS)}
    ${rod(100, 166, 100, 122, BRASS, 4)}
    ${orb(100, 98, 25)}
    ${cone(100, 124, 166, 8, 30, 0.24)}
    ${floorGlow(100, 166, 32, 0.2)}`,

  // ── Desk ──────────────────────────────────────────────────────────────────
  desk_architect_white: () => `<rect x="26" y="158" width="52" height="10" rx="5" fill="${STEEL}"/>
    <rect x="66" y="146" width="10" height="14" rx="3" fill="${STEEL}"/>
    <path d="M74 150 L112 96 L140 74" fill="none" stroke="${STEEL}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="112" cy="96" r="4" fill="#9aa1a8"/>
    <g transform="rotate(-34 142 70)">
      ${coneShade(142, 56, 16, 86, 28, WHITE)}
      ${domeLit(142, 86, 27, 4, 1)}
    </g>
    ${halo(142, 84, 30, 0.34)}
    ${cone(150, 96, 166, 14, 32, 0.34)}
    ${floorGlow(150, 168, 28, 0.18)}`,

  desk_architect_black: () => `<rect x="26" y="158" width="52" height="10" rx="5" fill="${STEEL}"/>
    <rect x="66" y="146" width="10" height="14" rx="3" fill="${BLACK}"/>
    <path d="M74 150 L112 96 L140 74" fill="none" stroke="${BLACK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="112" cy="96" r="4" fill="${BLACK}"/>
    <g transform="rotate(-34 142 70)">
      ${coneShade(142, 56, 16, 86, 28, BLACK)}
      ${domeLit(142, 86, 26, 4, 0.95)}
    </g>
    ${halo(142, 84, 28, 0.3)}
    ${cone(150, 96, 166, 14, 32, 0.3)}
    ${floorGlow(150, 168, 28, 0.16)}`,

  desk_clamp_white: () => `<rect x="18" y="150" width="46" height="14" rx="4" fill="${STEEL}"/>
    <rect x="24" y="164" width="34" height="8" rx="3" fill="#5a6067"/>
    <path d="M44 150 V92 Q44 74 66 74 H110" fill="none" stroke="${STEEL}" stroke-width="4" stroke-linecap="round"/>
    ${coneShade(120, 62, 18, 88, 30, WHITE)}
    ${domeLit(120, 88, 29, 4, 1)}
    ${halo(120, 86, 32, 0.34)}
    ${cone(120, 94, 158, 16, 34, 0.3)}
    ${floorGlow(120, 166, 30, 0.16)}`,

  desk_ring: () => `${disc(70, 162, 26, 6, STEEL)}
    ${rod(70, 162, 70, 88, STEEL, 4)}
    ${rod(70, 88, 100, 88, STEEL, 4)}
    <circle cx="124" cy="82" r="30" fill="none" stroke="${STEEL}" stroke-width="6"/>
    <circle class="lit" cx="124" cy="82" r="26" fill="none" stroke="url(#ltfill)" stroke-width="4" style="--k:1"/>
    ${halo(124, 82, 48, 0.36)}
    ${cone(124, 86, 158, 18, 38, 0.28)}
    ${floorGlow(124, 164, 30, 0.18)}`,

  // ── Outdoor ───────────────────────────────────────────────────────────────
  outdoor_bollard: () => `${disc(100, 168, 24, 6, '#20361f')}
    <rect x="90" y="86" width="20" height="82" rx="4" fill="${STEEL}"/>
    ${dome(100, 86, 16, 14, BLACK)}
    ${domeLit(100, 84, 13, 11, 0.95)}
    ${halo(100, 80, 30, 0.4)}
    ${cone(100, 90, 160, 12, 28, 0.3)}
    ${floorGlow(100, 168, 34, 0.22)}`,

  outdoor_wall_square: () => `<rect x="52" y="52" width="96" height="80" rx="8" fill="${STEEL}"/>
    <rect class="lit" x="62" y="62" width="76" height="60" rx="4" fill="url(#ltfill)" style="--k:.85"/>
    <path d="M100 62 V122 M62 92 H138" stroke="${STEEL}" stroke-width="3"/>
    ${halo(100, 92, 50, 0.4)}
    ${cone(100, 132, 168, 30, 52, 0.28)}
    ${floorGlow(100, 168, 42, 0.2)}`,

  outdoor_post: () => `${disc(100, 168, 26, 6, '#20361f')}
    <rect x="94" y="70" width="12" height="98" rx="3" fill="${STEEL}"/>
    <path d="M70 70 H130 L122 40 H78 Z" fill="${BLACK}"/>
    <rect x="74" y="40" width="52" height="30" rx="4" fill="${STEEL}"/>
    <rect class="lit" x="80" y="46" width="40" height="18" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    ${halo(100, 64, 42, 0.4)}
    ${cone(100, 72, 160, 24, 44, 0.28)}
    ${floorGlow(100, 168, 40, 0.22)}`,

  outdoor_floodlight: () => `<rect x="60" y="72" width="80" height="46" rx="8" fill="${BLACK}" transform="rotate(-8 100 95)"/>
    <rect class="lit" x="68" y="80" width="64" height="30" rx="4" fill="url(#ltfill)" style="--k:.9" transform="rotate(-8 100 95)"/>
    ${rod(100, 118, 100, 150, STEEL, 4)}
    ${disc(100, 152, 22, 6, STEEL)}
    ${halo(100, 98, 54, 0.4)}
    <path class="lit beam" d="M72 112 L34 168 H166 L128 112 Z" fill="url(#ltcone)" style="--k:.55"/>
    ${floorGlow(100, 168, 58, 0.22)}`,

  // ── Strips ────────────────────────────────────────────────────────────────
  lightstrip: () => `
    <rect x="22" y="96" width="156" height="10" rx="5" fill="#262c33"/>
    <path class="lit" d="M22 106 Q100 118 178 106 L178 112 Q100 124 22 112 Z" fill="url(#ltfill)" style="--k:1"/>
    ${halo(100, 112, 70, 0.5)}
    <path class="lit beam" d="M30 112 L20 168 H180 L170 112 Z" fill="url(#ltcone)" style="--k:.55"/>
    ${floorGlow(100, 168, 72, 0.35)}`,

  strip_cove: () => `<rect x="20" y="40" width="160" height="14" rx="3" fill="#262c33"/>
    <rect x="20" y="54" width="160" height="10" rx="2" fill="#1a1f24"/>
    <rect class="lit" x="30" y="64" width="140" height="5" rx="2.5" fill="url(#ltfill)" style="--k:1"/>
    ${halo(100, 68, 68, 0.45)}
    <path class="lit beam" d="M40 69 L28 150 H172 L160 69 Z" fill="url(#ltcone)" style="--k:.45"/>
    ${floorGlow(100, 152, 64, 0.24)}`,

  strip_round: () => `<circle cx="100" cy="82" r="44" fill="none" stroke="#262c33" stroke-width="10"/>
    <circle class="lit" cx="100" cy="82" r="38" fill="none" stroke="url(#ltfill)" stroke-width="6" style="--k:1"/>
    ${halo(100, 82, 70, 0.42)}
    ${cone(100, 86, 160, 26, 54, 0.28)}
    ${floorGlow(100, 162, 44, 0.22)}`,

  strip_corner: () => `<path d="M40 34 V120 H160" fill="none" stroke="#262c33" stroke-width="10"/>
    <path class="lit" d="M40 40 V114 H154" fill="none" stroke="url(#ltfill)" stroke-width="6" style="--k:1"/>
    ${halo(96, 110, 64, 0.4)}
    <path class="lit beam" d="M46 120 L34 168 H166 L154 120 Z" fill="url(#ltcone)" style="--k:.4"/>
    ${floorGlow(100, 168, 56, 0.22)}`,

  strip_under: () => `<rect x="24" y="52" width="152" height="14" rx="3" fill="#262c33"/>
    <rect x="24" y="66" width="152" height="8" rx="2" fill="#1a1f24"/>
    <rect class="lit" x="34" y="74" width="132" height="5" rx="2.5" fill="url(#ltfill)" style="--k:1"/>
    ${halo(100, 78, 64, 0.42)}
    <path class="lit beam" d="M42 79 L30 156 H170 L158 79 Z" fill="url(#ltcone)" style="--k:.45"/>
    ${floorGlow(100, 158, 60, 0.24)}`,
};
