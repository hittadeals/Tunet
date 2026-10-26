import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';
import { getIconComponent } from '../../icons';

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

/**
 * Resolve the visual for a card header.
 *
 * Device illustrations replace the old icons. They stay at roughly icon size
 * on normal device cards and get a larger slot on cards that show consumption,
 * where the picture carries more information.
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
    <img
      src={artSrc}
      alt={alt}
      className={`${className} object-contain`}
      style={
        useLarge
          ? {
              ...style,
              width: '3rem',
              height: '3rem',
              borderRadius: '0.85rem',
              flexShrink: 0,
            }
          : { ...style, transform: 'scale(1.25)' }
      }
      draggable={false}
      {...rest}
    />
  );
  ArtVisual.displayName = 'EntityArtVisual';
  return ArtVisual;
}
