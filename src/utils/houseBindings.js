/**
 * Manual device bindings for the 3D house page.
 *
 * Rooms and doors no longer inherit devices from Home Assistant areas - the
 * user picks the entities for each room and the sensor behind each door. The
 * bindings live in the page settings as
 *
 *   { rooms: { [roomId]: entityId[] }, doors: { [doorId]: entityId } }
 *
 * and every helper here tolerates missing/old data so a settings blob from an
 * older build cannot break the page.
 */

import { normalizeName } from './houseScene';

export const EMPTY_HOUSE_BINDINGS = { rooms: {}, doors: {} };

export const ROOM_ENTITY_DOMAINS = [
  'light',
  'switch',
  'sensor',
  'binary_sensor',
  'climate',
  'media_player',
  'cover',
  'lock',
  'fan',
  'humidifier',
  'vacuum',
  'valve',
  'water_heater',
  'remote',
];

export const DOOR_ENTITY_DOMAINS = ['binary_sensor', 'cover', 'lock', 'switch', 'input_boolean'];

const OPEN_STATES = new Set(['on', 'open', 'opening', 'detected', 'true']);
const DOOR_DEVICE_CLASSES = new Set(['door', 'garage_door', 'opening', 'window', 'gate']);

function isEntityId(value) {
  return typeof value === 'string' && /^[a-z_]+\.[a-z0-9_]+$/i.test(value);
}

export function normalizeHouseBindings(value) {
  const rooms = {};
  const doors = {};

  const rawRooms = value?.rooms;
  if (rawRooms && typeof rawRooms === 'object' && !Array.isArray(rawRooms)) {
    Object.entries(rawRooms).forEach(([roomId, ids]) => {
      if (!Array.isArray(ids)) return;
      const unique = [...new Set(ids.filter(isEntityId))];
      if (unique.length > 0) rooms[roomId] = unique;
    });
  }

  const rawDoors = value?.doors;
  if (rawDoors && typeof rawDoors === 'object' && !Array.isArray(rawDoors)) {
    Object.entries(rawDoors).forEach(([doorId, id]) => {
      if (isEntityId(id)) doors[doorId] = id;
    });
  }

  return { rooms, doors };
}

export function getRoomEntityIds(bindings, roomId) {
  return bindings?.rooms?.[roomId] || [];
}

export function getDoorEntityId(bindings, doorId) {
  return bindings?.doors?.[doorId] || '';
}

export function isOpenState(state) {
  return OPEN_STATES.has(String(state || '').toLowerCase());
}

/** { [doorId]: true } for every door whose bound entity reports open. */
export function getDoorStates(doors, bindings, entities) {
  const states = {};
  (doors || []).forEach((door) => {
    const entityId = getDoorEntityId(bindings, door.id);
    if (!entityId) return;
    states[door.id] = isOpenState(entities?.[entityId]?.state);
  });
  return states;
}

export function getEntityName(entity, entityId) {
  return (
    entity?.attributes?.friendly_name || entityId?.split('.')[1]?.replace(/_/g, ' ') || entityId
  );
}

export function splitDomain(entityId) {
  return String(entityId || '').split('.')[0];
}

/**
 * Entities that can be placed in a room, filtered by domain and a free-text
 * search over the friendly name and entity id.
 */
export function searchRoomEntities(entities, { query = '', domain = 'all', exclude = [] } = {}) {
  const excluded = new Set(exclude);
  const needle = normalizeName(query);

  return Object.entries(entities || {})
    .map(([id, entity]) => ({ id, entity, domain: splitDomain(id) }))
    .filter((item) => ROOM_ENTITY_DOMAINS.includes(item.domain))
    .filter((item) => domain === 'all' || item.domain === domain)
    .filter((item) => !excluded.has(item.id))
    .filter((item) => {
      if (!needle) return true;
      const name = normalizeName(getEntityName(item.entity, item.id));
      return name.includes(needle) || normalizeName(item.id).includes(needle);
    })
    .sort((a, b) => getEntityName(a.entity, a.id).localeCompare(getEntityName(b.entity, b.id)));
}

/** Door-capable entities, with real door/garage sensors first. */
export function listDoorEntities(entities) {
  return Object.entries(entities || {})
    .map(([id, entity]) => ({ id, entity, domain: splitDomain(id) }))
    .filter((item) => DOOR_ENTITY_DOMAINS.includes(item.domain))
    .sort((a, b) => {
      const aDoor = DOOR_DEVICE_CLASSES.has(a.entity?.attributes?.device_class) ? 0 : 1;
      const bDoor = DOOR_DEVICE_CLASSES.has(b.entity?.attributes?.device_class) ? 0 : 1;
      if (aDoor !== bDoor) return aDoor - bDoor;
      return getEntityName(a.entity, a.id).localeCompare(getEntityName(b.entity, b.id));
    });
}

export function countBoundDevices(bindings) {
  const roomCount = Object.values(bindings?.rooms || {}).reduce(
    (sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0),
    0
  );
  return roomCount + Object.keys(bindings?.doors || {}).length;
}

/** Immutable add/remove helpers used by the binding editor. */
export function addRoomEntity(bindings, roomId, entityId) {
  if (!roomId || !isEntityId(entityId)) return bindings;
  const current = getRoomEntityIds(bindings, roomId);
  if (current.includes(entityId)) return bindings;
  return {
    ...bindings,
    rooms: { ...(bindings?.rooms || {}), [roomId]: [...current, entityId] },
  };
}

export function removeRoomEntity(bindings, roomId, entityId) {
  const current = getRoomEntityIds(bindings, roomId);
  if (!current.includes(entityId)) return bindings;
  const next = current.filter((id) => id !== entityId);
  const rooms = { ...(bindings?.rooms || {}) };
  if (next.length > 0) rooms[roomId] = next;
  else delete rooms[roomId];
  return { ...bindings, rooms };
}

export function setDoorEntity(bindings, doorId, entityId) {
  if (!doorId) return bindings;
  const doors = { ...(bindings?.doors || {}) };
  if (isEntityId(entityId)) doors[doorId] = entityId;
  else delete doors[doorId];
  return { ...bindings, doors };
}

/** Light entity ids bound to a room, used for fixtures and the room glow. */
export function getRoomLightEntityIds(bindings, roomId) {
  return getRoomEntityIds(bindings, roomId).filter((id) => splitDomain(id) === 'light');
}

