/**
 * One quiet status chip per card. Replaces the stacked bordered pills.
 *
 * @param {{ tone?: 'neutral' | 'active' | 'warning' | 'danger' | 'info', children: import('react').ReactNode, className?: string }} props
 */
export default function CardStatusChip({ tone = 'neutral', children, className = '' }) {
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
  return <span className={`card-chip ${toneClass} ${className}`}>{children}</span>;
}
