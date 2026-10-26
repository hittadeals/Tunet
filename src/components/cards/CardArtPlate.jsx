/**
 * Consistent device-art tile used by cards and panels.
 *
 * @param {{ artSrc: string, alt?: string, size?: 'compact' | 'standard' | 'hero', accent?: string, active?: boolean, className?: string, imgClassName?: string, imgStyle?: import('react').CSSProperties }} props
 */
export default function CardArtPlate({
  artSrc,
  alt = '',
  size = 'standard',
  accent,
  active = false,
  className = '',
  imgClassName = '',
  imgStyle,
  ...rest
}) {
  const sizeClass =
    size === 'hero'
      ? 'card-art-plate--hero'
      : size === 'compact'
        ? 'card-art-plate--compact'
        : '';
  return (
    <span
      className={`card-art-plate ${sizeClass} ${accent ? 'card-art-plate--accent' : ''} ${active ? 'card-art-plate--active' : ''} ${className}`}
      style={accent ? { '--plate-accent': accent } : undefined}
      {...rest}
    >
      <img
        src={artSrc}
        alt={alt}
        className={imgClassName}
        style={imgStyle}
        draggable={false}
      />
    </span>
  );
}
