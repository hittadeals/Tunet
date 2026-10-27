/**
 * Pure helpers for the 3D house page. Everything here is UI-agnostic so it can
 * be unit tested and reused by the 2D fallback.
 */

const DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Bounding box of a room's rectangles in model space. */
export function getRoomBounds(room) {
  const rects = room?.rects || [];
  if (rects.length === 0) return { x1: 0, z1: 0, x2: 0, z2: 0 };
  return rects.reduce(
    (acc, [x1, z1, x2, z2]) => ({
      x1: Math.min(acc.x1, x1),
      z1: Math.min(acc.z1, z1),
      x2: Math.max(acc.x2, x2),
      z2: Math.max(acc.z2, z2),
    }),
    { x1: Infinity, z1: Infinity, x2: -Infinity, z2: -Infinity }
  );
}

export function getRoomCenter(room) {
  const { x1, z1, x2, z2 } = getRoomBounds(room);
  return { x: (x1 + x2) / 2, z: (z1 + z2) / 2 };
}

/** Aggregated values shown in the scene labels and the room panel. */
export function getRoomStats(rooms, roomEntityIds, entities) {
  const stats = {};
  rooms.forEach((room) => {
    const ids = roomEntityIds?.[room.id] || [];
    const roomStats = {
      lightsOn: 0,
      lightsTotal: 0,
      activeCount: 0,
      unavailableCount: 0,
      temperature: null,
      humidity: null,
    };

    ids.forEach((id) => {
      const entity = entities?.[id];
      if (!entity) return;
      const domain = id.split('.')[0];
      const attrs = entity.attributes || {};

      if (entity.state === 'unavailable' || entity.state === 'unknown') {
        roomStats.unavailableCount += 1;
        return;
      }
      if (domain === 'light') {
        roomStats.lightsTotal += 1;
        if (entity.state === 'on') roomStats.lightsOn += 1;
      }
      if (['on', 'playing', 'cleaning', 'open'].includes(entity.state)) {
        roomStats.activeCount += 1;
      }
      if (
        domain === 'sensor' &&
        attrs.device_class === 'temperature' &&
        roomStats.temperature === null
      ) {
        const value = Number.parseFloat(entity.state);
        if (Number.isFinite(value)) roomStats.temperature = Math.round(value * 10) / 10;
      }
      if (domain === 'sensor' && attrs.device_class === 'humidity' && roomStats.humidity === null) {
        const value = Number.parseFloat(entity.state);
        if (Number.isFinite(value)) roomStats.humidity = Math.round(value);
      }
    });

    stats[room.id] = roomStats;
  });
  return stats;
}

const WARM_LIGHT_FALLBACK = { r: 255, g: 183, b: 77 };

/** True for neutral white light, where every channel is close to the max. */
function isNeutralWhite({ r, g, b }) {
  const max = Math.max(r, g, b);
  return max >= 200 && max - Math.min(r, g, b) <= max * 0.1;
}

/** Warm/cool light color from a HA light entity, as 0-255 channels. */
export function getLightColor(entity) {
  const attrs = entity?.attributes || {};
  let color = null;
  if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3) {
    color = { r: attrs.rgb_color[0], g: attrs.rgb_color[1], b: attrs.rgb_color[2] };
  } else if (Number.isFinite(attrs.color_temp_kelvin)) {
    const kelvin = attrs.color_temp_kelvin;
    if (kelvin <= 2700) color = { r: 255, g: 166, b: 60 };
    else if (kelvin <= 3500) color = { r: 255, g: 195, b: 110 };
    else if (kelvin <= 4500) color = { r: 255, g: 220, b: 170 };
    else color = { r: 210, g: 225, b: 255 };
  }

  // Neutral white (plain white bulbs and light groups averaging their members)
  // should still read as warm amber, so they match the rest of the lights.
  if (!color || isNeutralWhite(color)) return { ...WARM_LIGHT_FALLBACK };
  return color;
}

const SUN_FALLBACK = { elevation: 24, azimuth: 150 };

/**
 * Sun position and daylight strength for the 3D scene, derived from the
 * Home Assistant `sun.sun` attributes (degrees, azimuth 0 = north).
 */
export function getSunPose(elevation, azimuth, distance = 34) {
  const elev = Number.isFinite(Number(elevation)) ? Number(elevation) : SUN_FALLBACK.elevation;
  const azim = Number.isFinite(Number(azimuth)) ? Number(azimuth) : SUN_FALLBACK.azimuth;
  const elevationRad = (elev * Math.PI) / 180;
  const azimuthRad = (azim * Math.PI) / 180;
  const cosElevation = Math.cos(elevationRad);

  // 0 at/below the horizon, 1 once the sun is properly up.
  const daylight = Math.max(0, Math.min(1, Math.sin(elevationRad) * 2.6 + 0.04));
  const warmth = Math.max(0, 1 - daylight * 1.4);
  const color = {
    r: 1,
    g: 0.78 + 0.17 * (1 - warmth),
    b: 0.55 + 0.33 * (1 - warmth),
  };

  return {
    daylight,
    elevation: elev,
    azimuth: azim,
    position: {
      // North is -z (the entrance faces +z) and east is +x.
      x: Math.sin(azimuthRad) * cosElevation * distance,
      y: Math.max(1.5, Math.sin(elevationRad) * distance),
      z: -Math.cos(azimuthRad) * cosElevation * distance,
    },
    intensity: 0.04 + daylight * 1.25,
    color,
  };
}

export function isDimmableLight(entity) {
  const modes = entity?.attributes?.supported_color_modes;
  if (Array.isArray(modes)) return !modes.includes('onoff') || modes.length > 1;
  return Number.isFinite(entity?.attributes?.brightness);
}

export function getBrightnessPercent(entity) {
  const brightness = entity?.attributes?.brightness;
  if (!Number.isFinite(brightness)) return entity?.state === 'on' ? 100 : 0;
  return Math.round((brightness / 255) * 100);
}

/** "22,4°" without hard-coding the unit in the page. */
export function formatRoomValue(value, unit, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const rounded = Number(Number(value).toFixed(decimals));
  return `${rounded}${unit ? ` ${unit}` : ''}`;
}

const SEGMENT_EPSILON = 1e-6;

function roomEdges(room) {
  return (room.rects || []).flatMap(([x1, z1, x2, z2]) => [
    [x1, z1, x2, z1],
    [x2, z1, x2, z2],
    [x1, z2, x2, z2],
    [x1, z1, x1, z2],
  ]);
}

function toAxisSegment([x1, z1, x2, z2]) {
  if (Math.abs(z1 - z2) < SEGMENT_EPSILON) {
    return { axis: 'x', at: z1, start: Math.min(x1, x2), end: Math.max(x1, x2) };
  }
  if (Math.abs(x1 - x2) < SEGMENT_EPSILON) {
    return { axis: 'z', at: x1, start: Math.min(z1, z2), end: Math.max(z1, z2) };
  }
  return null;
}

function cutIntervals(intervals, cuts) {
  return cuts.reduce(
    (remaining, [cutStart, cutEnd]) =>
      remaining.flatMap(([start, end]) => {
        if (cutEnd <= start + SEGMENT_EPSILON || cutStart >= end - SEGMENT_EPSILON) {
          return [[start, end]];
        }
        const pieces = [];
        if (cutStart > start + SEGMENT_EPSILON) pieces.push([start, cutStart]);
        if (cutEnd < end - SEGMENT_EPSILON) pieces.push([cutEnd, end]);
        return pieces;
      }),
    intervals
  );
}

/**
 * Union of the intervals on one wall line. Rooms that only share part of an
 * edge (an L-shaped room next to a smaller room) would otherwise emit two
 * coincident wall pieces for the overlapping span.
 */
function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  sorted.forEach(([start, end]) => {
    const last = merged[merged.length - 1];
    if (last && start < last[1] - SEGMENT_EPSILON) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  });
  return merged;
}

/**
 * Unique wall segments for a set of rooms, minus the opening rectangles.
 *
 * Shared walls between two rooms are emitted once, and an opening (a doorway
 * or a fully open edge between two rooms) removes the covered part of the
 * wall, splitting it in two when the opening only covers a section.
 */
export function buildWallSegments(rooms, openings = []) {
  const walls = new Map();

  (rooms || []).forEach((room) => {
    roomEdges(room).forEach((edge) => {
      const segment = toAxisSegment(edge);
      if (!segment) return;
      const key = `${segment.axis}:${segment.at.toFixed(3)}`;
      if (!walls.has(key)) walls.set(key, { ...segment, intervals: [] });
      const wall = walls.get(key);
      const exists = wall.intervals.some(
        ([start, end]) =>
          Math.abs(start - segment.start) < SEGMENT_EPSILON &&
          Math.abs(end - segment.end) < SEGMENT_EPSILON
      );
      if (!exists) wall.intervals.push([segment.start, segment.end]);
    });
  });

  (openings || []).forEach((opening) => {
    (opening.rects || []).forEach(([x1, z1, x2, z2]) => {
      const cut = toAxisSegment([x1, z1, x2, z2]);
      if (!cut) return;
      const wall = walls.get(`${cut.axis}:${cut.at.toFixed(3)}`);
      if (!wall) return;
      wall.intervals = cutIntervals(wall.intervals, [[cut.start, cut.end]]);
    });
  });

  const segments = [];
  walls.forEach(({ axis, at, intervals }) => {
    mergeIntervals(intervals).forEach(([start, end]) => {
      if (end - start < SEGMENT_EPSILON) return;
      segments.push(
        axis === 'x'
          ? { horizontal: true, x1: start, z1: at, x2: end, z2: at }
          : { horizontal: false, x1: at, z1: start, x2: at, z2: end }
      );
    });
  });
  return segments;
}
