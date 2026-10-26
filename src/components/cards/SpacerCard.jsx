import { memo } from 'react';

/**
 * SpacerCard – a layout utility card for visual separation.
 *
 * Variants:
 *   'spacer'  – transparent empty block (visual gap)
 *   'divider' – horizontal line separator
 *   'section' – full-width section heading
 */

const SpacerCard = ({
  cardId,
  dragProps,
  controls,
  cardStyle,
  cardSettings,
  settingsKey,
  editMode,
  className = '',
  t,
}) => {
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const variant = settings.variant || 'spacer';
  const heading = typeof settings.heading === 'string' ? settings.heading.trim() : '';
  const headingAlign = ['left', 'center', 'right'].includes(settings.headingAlign)
    ? settings.headingAlign
    : 'center';
  const translate = t || ((key) => key);
  const sectionLabel = translate('addCard.spacer.section') || 'Section';

  const editClass = editMode
    ? 'border border-dashed border-[var(--glass-border)] cursor-move bg-[var(--card-bg)]/30'
    : '';

  return (
    <div
      {...dragProps}
      className={`relative flex h-full items-center justify-center rounded-3xl transition-all duration-300 ${editClass} ${className}`}
      style={
        editMode
          ? cardStyle
          : { ...cardStyle, backgroundColor: 'transparent', borderColor: 'transparent' }
      }
    >
      {controls}

      {variant === 'section' && (
        <div className="flex w-full items-center gap-3 px-1">
          <div className="min-w-0">
            <p className="card-eyebrow">{sectionLabel}</p>
            <p className="card-title truncate text-sm">{heading || sectionLabel}</p>
          </div>
          <span className="h-px flex-1 bg-[var(--surface-border)]" />
        </div>
      )}

      {variant === 'divider' && (
        <div className="w-full">
          {heading ? (
            headingAlign === 'left' ? (
              <div className="flex w-full items-center gap-3 px-4">
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
              </div>
            ) : headingAlign === 'right' ? (
              <div className="flex w-full items-center gap-3 px-4">
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
                <span className="text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-[var(--text-secondary)] uppercase">
                  {heading}
                </span>
                <span className="h-px flex-1 bg-[var(--text-muted)] opacity-30" />
              </div>
            )
          ) : (
            <hr className="border-t border-[var(--text-muted)] opacity-30" />
          )}
        </div>
      )}
    </div>
  );
};

export default memo(SpacerCard);
