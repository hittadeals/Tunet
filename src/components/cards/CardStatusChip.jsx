/**
 * One quiet status chip per card.
 *
 * @param {{ tone?: 'neutral' | 'active' | 'warning' | 'danger' | 'info', icon?: import('react').ComponentType<any>, children: import('react').ReactNode, className?: string }} props
 */
export default function CardStatusChip({
  tone = 'neutral',
  icon: Icon,
  children,
  className = '',
}) {
  const toneClass =
    tone === 'active'
      ? 'card-chip--active'
      : tone === 'warning'
        ? 'card-chip--warning'
        : tone === 'danger'
          ? 'card-chip--danger'
          : tone === 'info'
            ? 'card-chip--info'
            : '';
  return (
    <span className={`card-chip ${toneClass} ${Icon ? 'card-chip--icon' : ''} ${className}`}>
      {Icon ? <Icon className="h-3 w-3 shrink-0" /> : null}
      {children}
    </span>
  );
}
