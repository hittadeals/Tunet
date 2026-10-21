import { memo } from 'react';

/**
 * Shimmer placeholder used while a card is still loading its data.
 * It replaces the plain "LOADING" text so the grid keeps its rhythm.
 */
function CardSkeleton({ lines = 2, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-2 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="card-skeleton h-3 w-full rounded-full bg-[var(--glass-bg-hover)]"
          style={{
            width: index === lines - 1 ? '60%' : '100%',
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default memo(CardSkeleton);
