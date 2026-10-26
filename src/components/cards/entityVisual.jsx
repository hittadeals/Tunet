import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';
import { getIconComponent } from '../../icons';
import CardArtPlate from './CardArtPlate';

const CONSUMPTION_DEVICE_CLASSES = new Set([
  'power',
  'energy',
  'monetary',
  'gas',
  'water',
]);
const CONSUMPTION_UNITS = new Set([
  'w',
  'kw',
  'wh',
  'kwh',
  'mwh',
  'm3',
  'm³',
  'l',
  'liter',
  'eur',
  'sek',
  'nok',
  'dkk',
  'usd',
  '€',
  'kr',
  '$',
]);
const CONSUMPTION_ID = /(^|[._])(power|energy|consumption|cost)([._]|$)/;

/** True when a card is showing consumption/price rather than a plain device state. */
export function isConsumptionVisual(entity, entityId = '') {
  const attrs = entity?.attributes || {};
  const deviceClass = String(attrs.device_class || '').toLowerCase();
  if (CONSUMPTION_DEVICE_CLASSES.has(deviceClass)) return true;
  const unit = String(attrs.unit_of_measurement || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  if (CONSUMPTION_UNITS.has(unit)) return true;
  return CONSUMPTION_ID.test(String(entityId || '').toLowerCase());
}

/** Accent colour for the artwork plate, based on the entity domain. */
export function getEntityDomainAccent(entityId = '', entity) {
  if (isConsumptionVisual(entity, entityId)) return 'var(--domain-energy)';
  const domain = String(entityId).split('.')[0];
  if (domain === 'light') return 'var(--domain-light)';
  if (domain === 'climate') return 'var(--domain-climate)';
  if (domain === 'media_player') return 'var(--domain-media)';
  if (domain === 'fan' || domain === 'humidifier') return 'var(--domain-vent)';
  if (domain === 'cover') return 'var(--domain-cover)';
  if (domain === 'lock' || domain === 'alarm_control_panel' || domain === 'binary_sensor') {
    return 'var(--domain-security)';
  }
  if (domain === 'sensor') return 'var(--domain-climate)';
  return undefined;
}

/**
 * Resolve the visual for a card header.
 *
 * Device illustrations replace the old icons and sit on a shared neutral
 * plate. Consumption cards get a larger plate; normal cards use the compact
 * icon-sized plate. Without artwork the original icon is returned untouched.
 */
export function resolveEntityVisual({
  entityId,
  entity,
  iconName,
  fallback,
  customArt,
  artId,
  large = false,
}) {
  const artKey =
    customArt?.[entityId] !== undefined
      ? resolveEntityArtKey(entityId, entity, customArt)
      : resolveEntityArtKey(artId || entityId, entity, customArt);
  const artSrc = getDeviceArtSrc(artKey);
  const resolvedIconName = iconName || entity?.attributes?.icon;
  if (!artSrc) {
    return resolvedIconName ? getIconComponent(resolvedIconName) || fallback : fallback;
  }

  const useLarge = large || isConsumptionVisual(entity, entityId);

  const ArtVisual = ({ className = '', style, alt = '', ...rest }) => (
    <CardArtPlate
      artSrc={artSrc}
      alt={alt}
      size={useLarge ? 'hero' : 'standard'}
      accent={getEntityDomainAccent(artId || entityId, entity)}
      imgClassName={className}
      imgStyle={style}
      {...rest}
    />
  );
  ArtVisual.displayName = 'EntityArtVisual';
  return ArtVisual;
}
