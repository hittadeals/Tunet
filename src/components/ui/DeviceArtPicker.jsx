import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown, X } from '../../icons';
import DeviceArtImage from './DeviceArtImage';
import {
  getAutoDeviceArtKey,
  getDeviceArtCategory,
  getDeviceArtOptions,
  isDeviceArtKey,
} from '../../config/deviceArt';

/**
 * Per-entity illustration picker. The value is stored globally per entity:
 *   undefined      -> automatic match
 *   "none"         -> no illustration
 *   "<art key>"    -> forced illustration
 */
const INITIAL_VISIBLE = 12;

export default function DeviceArtPicker({
  entityId,
  entity,
  value,
  onChange,
  t,
  compact = false,
  defaultOpen = false,
  maxHeightClass = 'max-h-64',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [visibleCounts, setVisibleCounts] = useState({});
  const translate = useMemo(() => t || ((key) => key), [t]);

  useEffect(() => {
    setVisibleCounts({});
  }, [query]);

  const autoKey = getAutoDeviceArtKey(entityId, entity);
  const selectedKey = value === 'none' ? null : isDeviceArtKey(value) ? value : autoKey;
  const options = useMemo(() => getDeviceArtOptions(translate), [translate]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.key.replace(/_/g, ' ').includes(q) ||
        option.searchTerms.some((term) => term.toLowerCase().includes(q))
    );
  }, [options, query]);

  const choose = (key) => {
    onChange?.(key);
    setOpen(false);
    setQuery('');
  };

  const grouped = useMemo(() => {
    const order = [
      'bulbs',
      'pendants',
      'ceiling',
      'wall',
      'floor',
      'table',
      'outdoor',
      'strips',
      'appliances',
      'other',
    ];
    const map = new Map();
    filtered.forEach((option) => {
      const category = getDeviceArtCategory(option.key);
      if (!map.has(category)) map.set(category, []);
      map.get(category).push(option);
    });
    return order.filter((category) => map.has(category)).map((category) => [category, map.get(category)]);
  }, [filtered]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`popup-surface flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-[var(--glass-bg-hover)] ${
          compact ? 'justify-center' : ''
        }`}
        title={translate('deviceArt.choose')}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)]">
          {selectedKey ? (
            <DeviceArtImage artKey={selectedKey} className="h-10 w-10 object-contain" />
          ) : (
            <Camera className="h-5 w-5 text-[var(--text-muted)]" />
          )}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
              {value === 'none'
                ? translate('deviceArt.none')
                : selectedKey
                  ? options.find((option) => option.key === selectedKey)?.label || selectedKey
                  : translate('deviceArt.auto')}
            </span>
            <span className="block truncate text-[10px] text-[var(--text-muted)]">
              {value === 'none'
                ? translate('deviceArt.autoHint')
                : selectedKey
                  ? translate('deviceArt.changeHint')
                  : translate('deviceArt.autoHint')}
            </span>
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={translate('deviceArt.title')}
          className="popup-anim relative mt-2 rounded-2xl border border-[var(--glass-border)] p-3 shadow-2xl"
          style={{ background: 'var(--modal-bg)', backdropFilter: 'blur(20px)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translate('deviceArt.search')}
              className="popup-surface min-w-0 flex-1 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={translate('common.close')}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => choose(undefined)}
              aria-pressed={!value}
              className={`rounded-xl border px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                !value
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              {translate('deviceArt.auto')}
            </button>
            <button
              type="button"
              onClick={() => choose('none')}
              aria-pressed={value === 'none'}
              className={`rounded-xl border px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                value === 'none'
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              {translate('deviceArt.none')}
            </button>
          </div>

          <div className={`${maxHeightClass} space-y-3 overflow-y-auto pr-1 overscroll-contain`}>
            {grouped.map(([category, items]) => {
              const limit = visibleCounts[category] ?? INITIAL_VISIBLE;
              const visible = items.slice(0, limit);
              const remaining = items.length - visible.length;
              return (
                <details key={category} open className="group/category">
                  <summary className="sticky top-0 z-10 mb-2 flex cursor-pointer list-none items-center gap-2 bg-[var(--modal-bg)] py-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase [&::-webkit-details-marker]:hidden">
                    {translate(`deviceArt.category.${category}`)}
                    <span className="text-[9px] font-normal opacity-60">({items.length})</span>
                    <span className="h-px flex-1 bg-[var(--glass-border)]" />
                  </summary>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {visible.map((option) => {
                      const active = option.key === selectedKey && value !== 'none';
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => choose(option.key)}
                          aria-pressed={active}
                          title={option.label}
                          className={`device-art-option flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                            active
                              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)]'
                              : 'border-transparent hover:bg-[var(--glass-bg-hover)]'
                          }`}
                        >
                          <DeviceArtImage artKey={option.key} className="h-14 w-14 object-contain" />
                          <span className="w-full truncate text-center text-[9px] leading-tight text-[var(--text-secondary)]">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCounts((counts) => ({
                            ...counts,
                            [category]: limit + 48,
                          }))
                        }
                        className="col-span-full rounded-xl border border-dashed border-[var(--glass-border)] px-2 py-2 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                      >
                        {translate('deviceArt.showMore')} ({remaining})
                      </button>
                    )}
                  </div>
                </details>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-[11px] text-[var(--text-muted)]">
                {translate('deviceArt.noResults')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
