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

function scoreMatch(room, areaName) {
  const normalizedArea = normalizeName(areaName);
  if (!normalizedArea) return 0;

  const label = normalizeName(room.label);
  if (label && label === normalizedArea) return 100;

  const keywords = (room.keywords || []).map(normalizeName);
  if (keywords.includes(normalizedArea)) return 90;

  if (label.includes(normalizedArea) || normalizedArea.includes(label)) return 60;
  if (keywords.some((keyword) => keyword.length >= 3 && normalizedArea.includes(keyword))) return 50;
  return 0;
}

/**
 * Greedy area <-> room matching based on name and keywords.
 * Returns { [roomId]: areaId } for rooms with a confident match.
 */
export function buildAutoAreaMap(rooms, areas) {
  const pairs = [];
  rooms.forEach((room) => {
    (areas || []).forEach((area) => {
      const score = scoreMatch(room, area.name);
      if (score > 0) pairs.push({ roomId: room.id, areaId: area.area_id, score });
    });
  });

  pairs.sort((a, b) => b.score - a.score);

  const map = {};
  const usedAreas = new Set();
  pairs.forEach(({ roomId, areaId, score }) => {
    if (map[roomId] || usedAreas.has(areaId)) return;
    if (score < 50) return;
    map[roomId] = areaId;
    usedAreas.add(areaId);
  });
  return map;
}

/**
 * Merge automatic matches with the user's saved overrides. An empty string is
 * an explicit "no area" and is kept as such.
 */
export function resolveAreaMap(rooms, areas, savedMap = {}) {
  const auto = buildAutoAreaMap(rooms, areas);
  const resolved = { ...auto };
  rooms.forEach((room) => {
    if (Object.prototype.hasOwnProperty.call(savedMap || {}, room.id)) {
      const value = savedMap[room.id];
      if (value) resolved[room.id] = value;
      else delete resolved[room.id];
    }
  });
  return resolved;
}

function matchesKeywords(entity, room) {
  const name = normalizeName(entity?.attributes?.friendly_name || '');
  if (!name) return false;
  return (room.keywords || []).some((keyword) => {
    const normalized = normalizeName(keyword);
    return normalized.length >= 3 && name.includes(normalized);
  });
}

/**
 * Entity ids per room. Prefers the mapped HA area; falls back to matching the
 * entity's friendly name against the room keywords so the page is useful before
 * the area registry is complete.
 */
export function collectRoomEntityIds({ rooms, areaMap, areaEntityIds, entities }) {
  const result = {};
  rooms.forEach((room) => {
    const areaId = areaMap?.[room.id];
    if (areaId) {
      result[room.id] = (areaEntityIds?.[areaId] || []).filter((id) => entities?.[id]);
      return;
    }
    result[room.id] = Object.entries(entities || {})
      .filter(([, entity]) => matchesKeywords(entity, room))
      .map(([id]) => id);
  });
  return result;
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
      if (domain === 'sensor' && attrs.device_class === 'temperature' && roomStats.temperature === null) {
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

/** Warm/cool light color from a HA light entity, as 0-255 channels. */
export function getLightColor(entity) {
  const attrs = entity?.attributes || {};
  if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3) {
    return { r: attrs.rgb_color[0], g: attrs.rgb_color[1], b: attrs.rgb_color[2] };
  }
  if (Number.isFinite(attrs.color_temp_kelvin)) {
    const kelvin = attrs.color_temp_kelvin;
    if (kelvin <= 2700) return { r: 255, g: 166, b: 60 };
    if (kelvin <= 3500) return { r: 255, g: 195, b: 110 };
    if (kelvin <= 4500) return { r: 255, g: 220, b: 170 };
    return { r: 210, g: 225, b: 255 };
  }
  return { r: 255, g: 183, b: 77 };
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
    intervals.forEach(([start, end]) => {
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
