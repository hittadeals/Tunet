/**
 * Additional lamp illustrations drawn for Tunet in the same visual language as
 * the imported MIT set (200 × 180 canvas, shared gradients and lit classes).
 * They are written by `scripts/import-lamp-art.mjs`.
 */

const halo = (cx, cy, r, k = 0.5) =>
  `<circle class="lit halo lcf" cx="${cx}" cy="${cy}" r="${r}" style="--k:${k}" filter="url(#ltblur)"/>`;

const cord = (x1, y1, x2, y2, width = 1.6) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#3a3f45" stroke-width="${width}"/>`;

const rose = (x, y, w = 16) =>
  `<rect x="${x - w / 2}" y="${y}" width="${w}" height="9" rx="3" fill="url(#ltbrass)"/>`;

const orb = (x, y, r, k = 1) => `${halo(x, y, r * 2.1, 0.5)}
  <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".35"/>
  <circle class="lit" cx="${x}" cy="${y}" r="${r}" fill="url(#ltfill)" style="--k:${k}"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#ltglass)"/>`;

const cone = (cx, top, bottom, halfTop, halfBottom, k = 0.55) =>
  `<path class="lit beam" d="M${cx - halfTop} ${top} L${cx - halfBottom} ${bottom} L${cx + halfBottom} ${bottom} L${cx + halfTop} ${top} Z" fill="url(#ltcone)" style="--k:${k}"/>`;

const floorGlow = (cx, y, rx, k = 0.35) =>
  `<ellipse class="lit" cx="${cx}" cy="${y}" rx="${rx}" ry="6" fill="var(--lc)" style="--k:${k}" filter="url(#ltsoft)"/>`;

const lit = (d, k = 0.95) =>
  `<path class="lit" d="${d}" fill="url(#ltfill)" style="--k:${k}"/>`;

const spotHead = (x, y, angle, scale = 1) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
  <path d="M-10 0 H10 L14 30 H-14 Z" fill="#3f464d"/>
  <ellipse cx="0" cy="30" rx="14" ry="4.2" fill="url(#ltbezel)"/>
  <ellipse class="lit" cx="0" cy="30" rx="10" ry="3" fill="url(#ltfill)" style="--k:1"/>
  <path class="lit beam" d="M-11 34 L-20 92 L20 92 L11 34 Z" fill="url(#ltcone)" style="--k:.38"/>
</g>`;

export const GALLERY_LAMPS = {
  // ── Pendants ──────────────────────────────────────────────────────────────
  pendant_globe: () => `${cord(100, 0, 100, 44)}${rose(100, 36)}
    ${orb(100, 80, 24)}
    ${cone(100, 104, 166, 10, 34, 0.4)}
    ${floorGlow(100, 168, 36)}`,

  pendant_double: () => `<rect x="54" y="28" width="92" height="7" rx="3.5" fill="url(#ltbrass)"/>
    ${cord(100, 0, 100, 28)}${cord(76, 35, 76, 62)}${cord(124, 35, 124, 62)}
    ${rose(76, 54, 12)}${rose(124, 54, 12)}
    ${orb(76, 80, 16)}${orb(124, 80, 16)}
    ${floorGlow(76, 168, 26, 0.28)}${floorGlow(124, 168, 26, 0.28)}`,

  pendant_quintet: () => `<rect x="38" y="24" width="124" height="6" rx="3" fill="url(#ltbrass)"/>
    ${cord(100, 0, 100, 24)}
    ${[
      [52, 66, 12],
      [76, 60, 12],
      [100, 54, 13],
      [124, 60, 12],
      [148, 66, 12],
    ]
      .map(([x, y, r]) => `${cord(x, 30, x, y - 10)}${orb(x, y, r, 0.9)}`)
      .join('')}
    ${floorGlow(100, 168, 54, 0.25)}`,

  pendant_drum: () => `${cord(100, 0, 100, 36)}${rose(100, 29)}
    <rect x="56" y="38" width="88" height="56" rx="6" fill="#e9e1d2"/>
    <rect class="lit" x="60" y="42" width="80" height="48" rx="4" fill="url(#ltfill)" style="--k:.9"/>
    <ellipse cx="100" cy="94" rx="44" ry="6" fill="#c9bda7"/>
    ${cone(100, 96, 166, 24, 54, 0.5)}
    ${floorGlow(100, 168, 46, 0.3)}`,

  pendant_cone: () => `${cord(100, 0, 100, 32)}${rose(100, 25)}
    <path d="M76 34 H124 L152 100 H48 Z" fill="#525b66"/>
    ${lit('M76 34 H124 L152 100 H48 Z')}
    <ellipse class="lit" cx="100" cy="100" rx="52" ry="6" fill="url(#ltfill)" style="--k:1"/>
    ${cone(100, 104, 166, 28, 56, 0.5)}
    ${floorGlow(100, 168, 48, 0.3)}`,

  pendant_bell: () => `${cord(100, 0, 100, 30)}${rose(100, 23)}
    <path d="M86 32 H114 L148 94 Q100 110 52 94 Z" fill="#525b66"/>
    ${lit('M86 32 H114 L148 94 Q100 110 52 94 Z')}
    <ellipse class="lit" cx="100" cy="96" rx="48" ry="7" fill="url(#ltfill)" style="--k:1"/>
    ${cone(100, 102, 166, 26, 52, 0.45)}
    ${floorGlow(100, 168, 44, 0.28)}`,

  pendant_ring: () => `${cord(100, 0, 100, 38)}
    <circle cx="100" cy="78" r="36" fill="none" stroke="url(#ltsteel)" stroke-width="8"/>
    <circle class="lit" cx="100" cy="78" r="32" fill="none" stroke="url(#ltfill)" stroke-width="6" style="--k:1"/>
    ${halo(100, 78, 62, 0.45)}
    ${cone(100, 82, 166, 18, 44, 0.35)}
    ${floorGlow(100, 168, 36, 0.28)}`,

  pendant_square: () => `${cord(100, 0, 100, 34)}${rose(100, 27)}
    <rect x="58" y="36" width="84" height="52" rx="5" fill="#3f464d"/>
    <rect class="lit" x="64" y="42" width="72" height="40" rx="3" fill="url(#ltfill)" style="--k:.9"/>
    ${cone(100, 90, 166, 24, 48, 0.45)}
    ${floorGlow(100, 168, 42, 0.26)}`,

  // ── Ceiling ───────────────────────────────────────────────────────────────
  ceiling_flush: () => `<ellipse cx="100" cy="34" rx="46" ry="9" fill="url(#ltbezel)"/>
    <path d="M54 34 Q100 92 146 34 Z" fill="#e9e1d2"/>
    ${lit('M54 34 Q100 92 146 34 Z')}
    ${halo(100, 54, 56, 0.45)}
    ${cone(100, 56, 166, 22, 50, 0.35)}
    ${floorGlow(100, 168, 46, 0.28)}`,

  ceiling_panel: () => `<rect x="44" y="26" width="112" height="26" rx="7" fill="url(#ltbezel)"/>
    <rect class="lit" x="50" y="32" width="100" height="15" rx="3" fill="url(#ltfill)" style="--k:1"/>
    ${cone(100, 50, 166, 26, 56, 0.35)}
    ${floorGlow(100, 168, 48, 0.26)}`,

  ceiling_ring: () => `<circle cx="100" cy="46" r="44" fill="none" stroke="url(#ltbezel)" stroke-width="10"/>
    <circle class="lit" cx="100" cy="46" r="38" fill="none" stroke="url(#ltfill)" stroke-width="6" style="--k:1"/>
    ${halo(100, 46, 66, 0.4)}
    ${cone(100, 50, 166, 28, 56, 0.3)}
    ${floorGlow(100, 168, 46, 0.24)}`,

  ceiling_spot_two: () => `${halo(66, 48, 40, 0.45)}${halo(134, 48, 40, 0.45)}
    ${[
      [66, 48],
      [134, 48],
    ]
      .map(
        ([x, y]) => `<circle cx="${x}" cy="${y + 1.5}" r="27" fill="#000" opacity=".3" filter="url(#ltsoft)"/>
      <circle cx="${x}" cy="${y}" r="26" fill="url(#ltbezel)"/>
      <circle cx="${x}" cy="${y}" r="19" fill="#b7bcc3"/>
      <circle class="lit" cx="${x}" cy="${y}" r="18" fill="url(#ltspot)" style="--k:1"/>
      ${cone(x, y + 8, 166, 10, 30, 0.35)}`
      )
      .join('')}`,

  ceiling_spot_four: () => `${[
    [62, 48],
    [138, 48],
    [62, 118],
    [138, 118],
  ]
    .map(
      ([x, y]) => `${halo(x, y, 34, 0.4)}
      <circle cx="${x}" cy="${y + 1.5}" r="23" fill="#000" opacity=".3" filter="url(#ltsoft)"/>
      <circle cx="${x}" cy="${y}" r="22" fill="url(#ltbezel)"/>
      <circle cx="${x}" cy="${y}" r="16" fill="#b7bcc3"/>
      <circle class="lit" cx="${x}" cy="${y}" r="15" fill="url(#ltspot)" style="--k:1"/>
      ${cone(x, y + 8, y + 58, 8, 24, 0.3)}`
    )
    .join('')}`,

  ceiling_bar: () => `<rect x="48" y="22" width="104" height="8" rx="4" fill="url(#ltsteel)"/>
    ${[68, 100, 132].map((x) => spotHead(x, 32, 0, 0.9) + halo(x, 40, 26, 0.35)).join('')}`,

  // ── Track ─────────────────────────────────────────────────────────────────
  track_two: () => `<rect x="60" y="22" width="80" height="7" rx="3.5" fill="url(#ltsteel)"/>
    ${spotHead(78, 31, -10)}${spotHead(122, 31, 10)}`,

  track_four: () => `<rect x="28" y="22" width="144" height="7" rx="3.5" fill="url(#ltsteel)"/>
    ${[52, 84, 116, 148].map((x, i) => spotHead(x, 31, i % 2 ? 9 : -9, 0.85)).join('')}`,

  track_long: () => `<rect x="18" y="22" width="164" height="7" rx="3.5" fill="url(#ltsteel)"/>
    ${[58, 100, 142].map((x, i) => spotHead(x, 31, i === 1 ? 0 : i === 0 ? -12 : 12, 1)).join('')}`,

  // ── Wall ──────────────────────────────────────────────────────────────────
  wall_updown: () => `<rect x="86" y="44" width="28" height="76" rx="6" fill="#3f464d"/>
    <rect class="lit" x="92" y="50" width="16" height="28" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    <rect class="lit" x="92" y="86" width="16" height="28" rx="2" fill="url(#ltfill)" style="--k:.9"/>
    ${halo(100, 84, 44, 0.45)}
    <path class="lit beam" d="M90 46 L76 4 L124 4 L110 46 Z" fill="url(#ltup)" style="--k:.55"/>
    ${cone(100, 116, 166, 12, 36, 0.45)}
    ${floorGlow(100, 168, 32, 0.26)}`,

  wall_reading: () => `<rect x="36" y="72" width="11" height="46" rx="4" fill="url(#ltsteel)"/>
    <path d="M47 88 H76 L96 70" fill="none" stroke="url(#ltsteel)" stroke-width="4" stroke-linecap="round"/>
    <path d="M92 62 L124 62 L132 86 L84 86 Z" fill="#e9e1d2"/>
    ${lit('M92 62 L124 62 L132 86 L84 86 Z')}
    ${halo(108, 82, 34, 0.4)}
    ${cone(108, 88, 156, 16, 38, 0.4)}
    ${floorGlow(108, 158, 30, 0.22)}`,

  wall_round: () => `<rect x="32" y="76" width="10" height="34" rx="4" fill="url(#ltsteel)"/>
    <circle cx="52" cy="92" r="14" fill="url(#ltsteel)"/>
    <path d="M52 92 H74" stroke="url(#ltbrass)" stroke-width="4"/>
    <path d="M70 92 A26 26 0 0 1 122 92 Z" fill="#e9e1d2"/>
    ${lit('M70 92 A26 26 0 0 1 122 92 Z')}
    ${halo(96, 90, 40, 0.45)}
    ${cone(96, 98, 160, 18, 40, 0.4)}
    ${floorGlow(96, 162, 32, 0.22)}`,

  wall_mirror: () => `<rect x="34" y="56" width="132" height="14" rx="7" fill="url(#ltsteel)"/>
    <rect class="lit" x="40" y="64" width="120" height="6" rx="3" fill="url(#ltfill)" style="--k:1"/>
    ${halo(100, 70, 56, 0.35)}
    ${cone(100, 72, 160, 42, 70, 0.3)}
    ${floorGlow(100, 162, 54, 0.2)}`,

  wall_lantern_round: () => `${halo(100, 88, 48, 0.5)}
    <circle cx="100" cy="88" r="34" fill="url(#ltbezel)"/>
    <circle cx="100" cy="88" r="28" fill="#b7bcc3"/>
    <circle class="lit" cx="100" cy="88" r="25" fill="url(#ltspot)" style="--k:1"/>
    <path d="M74 76 H126 M74 100 H126 M100 62 V114" stroke="#8a929a" stroke-width="1.4" opacity=".7"/>
    ${cone(100, 114, 166, 18, 38, 0.3)}
    ${floorGlow(100, 168, 34, 0.24)}`,

  // ── Floor ─────────────────────────────────────────────────────────────────
  floor_tripod: () => `<path d="M100 108 L64 174 M100 108 L136 174 M100 108 L102 172" stroke="#b07a46" stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="109" r="4" fill="#7a5530"/>
    <path d="M64 50 H136 L146 108 H54 Z" fill="#e9e1d2"/>
    ${lit('M64 50 H136 L146 108 H54 Z')}
    ${halo(100, 86, 56, 0.45)}
    ${cone(100, 110, 166, 26, 50, 0.4)}
    ${floorGlow(100, 168, 44, 0.26)}`,

  floor_drum: () => `<ellipse cx="100" cy="168" rx="26" ry="6" fill="url(#ltsteel)"/>
    <path d="M100 168 V122" stroke="#7c838b" stroke-width="4"/>
    <rect x="46" y="52" width="108" height="72" rx="7" fill="#e9e1d2"/>
    <rect class="lit" x="50" y="56" width="100" height="64" rx="5" fill="url(#ltfill)" style="--k:.92"/>
    <ellipse cx="100" cy="124" rx="54" ry="7" fill="#c9bda7"/>
    ${halo(100, 90, 60, 0.4)}
    ${cone(100, 126, 166, 34, 62, 0.35)}
    ${floorGlow(100, 168, 58, 0.24)}`,

  floor_twig: () => `<ellipse cx="100" cy="168" rx="24" ry="6" fill="url(#ltsteel)"/>
    <path d="M100 166 C94 130 78 96 66 58 M100 166 C100 128 100 96 100 40 M100 166 C106 130 122 96 134 58 M100 166 C92 140 86 126 80 112 M100 166 C108 140 114 126 122 112"
      fill="none" stroke="#7c838b" stroke-width="2.4" stroke-linecap="round"/>
    ${[
      [66, 54, 9],
      [100, 36, 11],
      [134, 54, 9],
      [80, 108, 7],
      [122, 108, 7],
    ]
      .map(([x, y, r]) => orb(x, y, r, 0.9))
      .join('')}
    ${floorGlow(100, 168, 46, 0.22)}`,

  floor_globe: () => `<ellipse cx="100" cy="168" rx="28" ry="6" fill="url(#ltsteel)"/>
    <path d="M100 168 V98" stroke="url(#ltsteel)" stroke-width="4"/>
    ${orb(100, 72, 26)}
    ${cone(100, 98, 166, 10, 38, 0.35)}
    ${floorGlow(100, 168, 40, 0.28)}`,

  // ── Table & desk ──────────────────────────────────────────────────────────
  table_ceramic: () => `<path d="M88 130 Q88 150 78 166 H122 Q112 150 112 130 Z" fill="url(#ltbrass)"/>
    <ellipse cx="100" cy="166" rx="24" ry="5" fill="#6b4524"/>
    <path d="M100 130 V120" stroke="#9c7a3a" stroke-width="4"/>
    <path d="M64 66 H136 L146 120 H54 Z" fill="#e9e1d2"/>
    ${lit('M64 66 H136 L146 120 H54 Z')}
    ${halo(100, 94, 50, 0.42)}
    ${cone(100, 122, 166, 26, 46, 0.32)}
    ${floorGlow(100, 168, 40, 0.22)}`,

  table_touch: () => `<ellipse cx="100" cy="162" rx="20" ry="5" fill="url(#ltsteel)"/>
    <path d="M100 162 V132" stroke="#7c838b" stroke-width="5"/>
    <path d="M68 132 A32 32 0 0 1 132 132 Z" fill="#e9e1d2"/>
    ${lit('M68 132 A32 32 0 0 1 132 132 Z')}
    ${halo(100, 116, 44, 0.45)}
    ${cone(100, 134, 166, 22, 42, 0.3)}
    ${floorGlow(100, 168, 34, 0.2)}`,

  desk_architect: () => `<rect x="26" y="158" width="52" height="10" rx="5" fill="url(#ltsteel)"/>
    <rect x="66" y="146" width="10" height="14" rx="3" fill="#7c838b"/>
    <path d="M74 150 L112 96 L140 74" fill="none" stroke="url(#ltsteel)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="112" cy="96" r="4" fill="#9aa1a8"/>
    <g transform="rotate(-34 142 70)"><path d="M128 56 L158 56 L170 86 L116 86 Z" fill="#4c555e"/>
      <ellipse cx="143" cy="86" rx="27" ry="4.5" fill="#2a2f35"/>
      <ellipse class="lit" cx="143" cy="86" rx="24" ry="4" fill="url(#ltfill)" style="--k:1"/></g>
    ${cone(150, 96, 166, 14, 34, 0.4)}
    ${floorGlow(150, 168, 32, 0.2)}`,

  desk_clamp: () => `<rect x="18" y="150" width="46" height="14" rx="4" fill="url(#ltsteel)"/>
    <rect x="24" y="164" width="34" height="8" rx="3" fill="#5a6067"/>
    <path d="M44 150 V92 Q44 74 66 74 H110" fill="none" stroke="url(#ltsteel)" stroke-width="4" stroke-linecap="round"/>
    <path d="M104 62 L134 62 L142 86 L96 86 Z" fill="#e9e1d2"/>
    ${lit('M104 62 L134 62 L142 86 L96 86 Z')}
    ${halo(118, 82, 34, 0.38)}
    ${cone(118, 88, 156, 16, 36, 0.35)}
    ${floorGlow(118, 168, 30, 0.18)}`,
};
