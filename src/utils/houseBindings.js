/**
 * Manual device bindings for the 3D house page.
 *
 * Rooms and doors no longer inherit devices from Home Assistant areas - the
 * user picks the entities for each room and the sensor behind each door. The
 * bindings live in the page settings as
 *
 *   { rooms: { [roomId]: entityId[] }, doors: { [doorId]: entityId },
 *     alarm: entityId, appliances: { washer: entityId, dryer: entityId } }
 *
 * and every helper here tolerates missing/old data so a settings blob from an
 * older build cannot break the page.
 */

import { normalizeName } from './houseScene';

export const APPLIANCE_KEYS = ['washer', 'dryer'];
export const APPLIANCE_POWER_THRESHOLD = 4;

export const EMPTY_HOUSE_BINDINGS = { rooms: {}, doors: {}, alarm: '', appliances: {} };

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
export const ALARM_ENTITY_DOMAIN = 'alarm_control_panel';
export const APPLIANCE_ENTITY_DOMAINS = [
  'sensor',
  'switch',
  'input_boolean',
  'binary_sensor',
  'fan',
];

const OPEN_STATES = new Set(['on', 'open', 'opening', 'detected', 'true']);
const DOOR_DEVICE_CLASSES = new Set(['door', 'garage_door', 'opening', 'window', 'gate']);

function isEntityId(value) {
  return typeof value === 'string' && /^[a-z_]+\.[a-z0-9_]+$/i.test(value);
}

export function normalizeHouseBindings(value) {
  const rooms = {};
  const doors = {};
  const appliances = {};

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

  const alarm = isEntityId(value?.alarm) ? value.alarm : '';
  APPLIANCE_KEYS.forEach((key) => {
    const id = value?.appliances?.[key];
    if (isEntityId(id)) appliances[key] = id;
  });

  return { rooms, doors, alarm, appliances };
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

export function getAlarmEntityId(bindings) {
  return bindings?.alarm || '';
}

/** Current alarm state plus the derived flags the scene and header use. */
export function getAlarmInfo(bindings, entities) {
  const entityId = getAlarmEntityId(bindings);
  const state = entityId ? entities?.[entityId]?.state || '' : '';
  return {
    entityId,
    state,
    armed: state.startsWith('armed_'),
    pending: ['arming', 'pending', 'disarming'].includes(state),
    triggered: state === 'triggered',
    unavailable: !state || state === 'unavailable' || state === 'unknown',
  };
}

export function listAlarmEntities(entities) {
  return Object.entries(entities || {})
    .filter(([id]) => splitDomain(id) === ALARM_ENTITY_DOMAIN)
    .map(([id, entity]) => ({ id, entity }))
    .sort((a, b) => getEntityName(a.entity, a.id).localeCompare(getEntityName(b.entity, b.id)));
}

export function getApplianceEntityId(bindings, key) {
  return bindings?.appliances?.[key] || '';
}

function powerWatts(entity) {
  const value = Number.parseFloat(entity?.state);
  if (!Number.isFinite(value)) return null;
  const unit = String(entity?.attributes?.unit_of_measurement || '').toLowerCase();
  if (unit === 'kw') return value * 1000;
  if (unit === 'w') return value;
  if (entity?.attributes?.device_class === 'power') return value;
  return null;
}

/** Running state for a washer/dryer bound to a power sensor or smart plug. */
export function getApplianceState(bindings, key, entities) {
  const entityId = getApplianceEntityId(bindings, key);
  const entity = entityId ? entities?.[entityId] : null;
  if (!entityId || !entity) return { entityId, running: false, power: null };

  const domain = splitDomain(entityId);
  if (domain !== 'sensor') {
    return { entityId, running: isOpenState(entity.state), power: null };
  }

  const power = powerWatts(entity);
  const running = power !== null ? power > APPLIANCE_POWER_THRESHOLD : false;
  return { entityId, running, power };
}

export function getApplianceStates(bindings, entities) {
  const states = {};
  APPLIANCE_KEYS.forEach((key) => {
    states[key] = getApplianceState(bindings, key, entities);
  });
  return states;
}

export function listApplianceEntities(entities) {
  const powerRank = (entity) => {
    if (entity?.attributes?.device_class === 'power') return 0;
    const unit = String(entity?.attributes?.unit_of_measurement || '').toLowerCase();
    if (unit === 'w' || unit === 'kw') return 0;
    return 1;
  };

  return Object.entries(entities || {})
    .map(([id, entity]) => ({ id, entity, domain: splitDomain(id) }))
    .filter((item) => APPLIANCE_ENTITY_DOMAINS.includes(item.domain))
    .filter((item) => {
      if (item.domain !== 'sensor') return true;
      const attrs = item.entity?.attributes || {};
      const unit = String(attrs.unit_of_measurement || '').toLowerCase();
      return (
        ['power', 'energy', 'current'].includes(attrs.device_class) ||
        ['w', 'kw', 'a'].includes(unit)
      );
    })
    .sort((a, b) => {
      const rank = powerRank(a.entity) - powerRank(b.entity);
      if (rank !== 0) return rank;
      return getEntityName(a.entity, a.id).localeCompare(getEntityName(b.entity, b.id));
    });
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
  const applianceCount = APPLIANCE_KEYS.filter((key) => bindings?.appliances?.[key]).length;
  return (
    roomCount +
    Object.keys(bindings?.doors || {}).length +
    applianceCount +
    (bindings?.alarm ? 1 : 0)
  );
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

export function setAlarmEntity(bindings, entityId) {
  return { ...bindings, alarm: isEntityId(entityId) ? entityId : '' };
}

export function setApplianceEntity(bindings, key, entityId) {
  if (!APPLIANCE_KEYS.includes(key)) return bindings;
  const appliances = { ...(bindings?.appliances || {}) };
  if (isEntityId(entityId)) appliances[key] = entityId;
  else delete appliances[key];
  return { ...bindings, appliances };
}

/** Light entity ids bound to a room, used for fixtures and the room glow. */
export function getRoomLightEntityIds(bindings, roomId) {
  return getRoomEntityIds(bindings, roomId).filter((id) => splitDomain(id) === 'light');
}
