import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';
import { getIconComponent } from '../../icons';

/**
 * Resolve the visual for a card header.
 *
 * When the entity has a device illustration (automatic or explicitly chosen),
 * it replaces the old icon. The returned component accepts the same
 * `className`/`style` props as the icon it replaces, and draws the artwork
 * slightly larger inside the existing icon slot.
 */
export function resolveEntityVisual({ entityId, entity, iconName, fallback, customArt, artId }) {
  const artKey =
    customArt?.[entityId] !== undefined
      ? resolveEntityArtKey(entityId, entity, customArt)
      : resolveEntityArtKey(artId || entityId, entity, customArt);
  const artSrc = getDeviceArtSrc(artKey);
  const resolvedIconName = iconName || entity?.attributes?.icon;
  if (!artSrc) {
    return resolvedIconName ? getIconComponent(resolvedIconName) || fallback : fallback;
  }

  const ArtVisual = ({ className = '', style, alt = '', ...rest }) => (
    <img
      src={artSrc}
      alt={alt}
      className={`${className} object-contain`}
      style={{ ...style, transform: 'scale(1.65)' }}
      draggable={false}
      {...rest}
    />
  );
  ArtVisual.displayName = 'EntityArtVisual';
  return ArtVisual;
}
