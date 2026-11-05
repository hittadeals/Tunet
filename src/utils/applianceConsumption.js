import { getAutoDeviceArtKey } from '../config/deviceArt';
import { normalizeName } from './houseScene';

const POWER_UNITS = new Set(['w', 'kw', 'mw']);
const ENERGY_UNITS = new Set(['wh', 'kwh', 'mwh']);
const IGNORED_NAME_TOKENS = new Set([
  'power',
  'watt',
  'watts',
  'w',
  'kw',
  'mw',
  'wh',
  'kwh',
  'mwh',
  'energy',
  'energi',
  'consumption',
  'consum',
  'forbrukning',
  'förbrukning',
  'effekt',
  'today',
  'idag',
  'daily',
  'current',
  'now',
  'sensor',
  'value',
  'total',
]);
const WHOLE_HOME_TOKENS = new Set([
  'total',
  'home',
  'house',
  'hus',
  'fastighet',
  'all',
  'sum',
  'main',
  'grid',
]);

function unitOf(entity) {
  return String(entity?.attributes?.unit_of_measurement || '')
    .trim()
    .toLowerCase();
}

export function isPowerEntity(entity) {
  if (!entity) return false;
  if (String(entity.attributes?.device_class || '').toLowerCase() === 'power') return true;
  return POWER_UNITS.has(unitOf(entity));
}

export function isEnergyEntity(entity) {
  if (!entity) return false;
  if (String(entity.attributes?.device_class || '').toLowerCase() === 'energy') return true;
  return ENERGY_UNITS.has(unitOf(entity));
}

function baseKey(entityId, entity) {
  const local = String(entityId || '').split('.')[1] || '';
  const tokens = normalizeName(local)
    .split(' ')
    .filter((token) => token && !IGNORED_NAME_TOKENS.has(token));
  if (tokens.length > 0) return tokens.join(' ');
  const friendly = normalizeName(entity?.attributes?.friendly_name || '');
  const friendlyTokens = friendly
    .split(' ')
    .filter((token) => token && !IGNORED_NAME_TOKENS.has(token));
  return friendlyTokens.join(' ') || local || String(entityId || '');
}

function isWholeHome(key) {
  return String(key)
    .split(' ')
    .some((token) => WHOLE_HOME_TOKENS.has(token));
}

function displayName(entity, key) {
  const friendly = String(entity?.attributes?.friendly_name || '').trim();
  if (!friendly) {
    return key
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return friendly
    .replace(
      /\b(power|watt|energy|consumption|effekt|energi|förbrukning|forbrukning|today|idag|daily|current|now|total)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim() || friendly;
}

function toWatts(entity) {
  const value = Number.parseFloat(entity?.state);
  if (!Number.isFinite(value)) return 0;
  const unit = unitOf(entity);
  if (unit === 'kw') return value * 1000;
  if (unit === 'mw') return value * 1_000_000;
  return value;
}

function toKwh(entity) {
  const value = Number.parseFloat(entity?.state);
  if (!Number.isFinite(value)) return 0;
  const unit = unitOf(entity);
  if (unit === 'wh') return value / 1000;
  if (unit === 'mwh') return value * 1000;
  return value;
}

const DAILY_ENERGY = /(today|idag|i_dag|daily|day|dag|24h)/i;
const LIFETIME_ENERGY = /(total|lifetime|alltime|all_time|sum|meter|reading|accumulated|since)/i;

function energyPriority(entity) {
  const haystack = `${entity?.entity_id || ''} ${entity?.attributes?.friendly_name || ''}`;
  let score = 0;
  if (DAILY_ENERGY.test(haystack)) score += 100;
  if (LIFETIME_ENERGY.test(haystack)) score -= 100;
  if (entity?.attributes?.last_period != null) score += 20;
  return score;
}

/** Pick one energy sensor per appliance instead of summing lifetime totals. */
function pickEnergyEntity(entities) {
  return [...entities].sort((a, b) => energyPriority(b) - energyPriority(a))[0] || null;
}

/** Group power/energy sensors into one appliance summary per device. */
export function getApplianceConsumption(entities = {}) {
  const groups = new Map();
  Object.values(entities).forEach((entity) => {
    const entityId = entity?.entity_id;
    if (!entityId) return;
    const power = isPowerEntity(entity);
    const energy = !power && isEnergyEntity(entity);
    if (!power && !energy) return;
    const key = baseKey(entityId, entity);
    if (!key || isWholeHome(key)) return;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: displayName(entity, key),
        areaName: entity.attributes?.area_name || null,
        artKey: getAutoDeviceArtKey(entityId, entity),
        powerEntities: [],
        energyEntities: [],
        powerW: 0,
        energyKwh: 0,
        active: false,
      });
    }
    const group = groups.get(key);
    if (power) group.powerEntities.push(entity);
    else group.energyEntities.push(entity);
    if (!group.areaName && entity.attributes?.area_name) group.areaName = entity.attributes.area_name;
    if (!group.artKey) group.artKey = getAutoDeviceArtKey(entityId, entity);
  });

  return [...groups.values()]
    .map((group) => {
      const powerW = group.powerEntities.reduce((sum, entity) => sum + toWatts(entity), 0);
      const energyEntity = pickEnergyEntity(group.energyEntities);
      const energyKwh = energyEntity ? toKwh(energyEntity) : 0;
      return {
        ...group,
        powerW,
        energyEntity,
        energyKwh,
        active: powerW > 1,
      };
    })
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (b.powerW !== a.powerW) return b.powerW - a.powerW;
      return a.name.localeCompare(b.name);
    });
}

export function formatPower(watts) {
  if (!Number.isFinite(watts) || watts <= 0) return '0 W';
  if (watts >= 1000) return `${(watts / 1000).toFixed(watts >= 10000 ? 0 : 1)} kW`;
  return `${Math.round(watts)} W`;
}

export function formatEnergy(kwh) {
  if (!Number.isFinite(kwh) || kwh <= 0) return '0 kWh';
  const decimals = kwh >= 10 ? 1 : 2;
  return `${kwh.toFixed(decimals)} kWh`;
}
