import { getDeviceArtSrc } from '../../config/deviceArt';

/**
 * Renders a vendored appliance illustration by key.
 * Returns null for unknown/disabled keys so callers can fall back to an icon.
 */
export default function DeviceArtImage({
  artKey,
  alt = '',
  className = '',
  loading = 'lazy',
  ...rest
}) {
  const src = getDeviceArtSrc(artKey);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      draggable={false}
      {...rest}
    />
  );
}
