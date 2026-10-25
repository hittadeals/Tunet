import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb, Power, X } from '../../icons';
import M3Slider from '../ui/M3Slider';
import DeviceArtImage from '../ui/DeviceArtImage';
import { getBrightnessPercent, getLightColor, isDimmableLight } from '../../utils/houseScene';

const SLIDER_DEBOUNCE_MS = 200;

/**
 * Compact lamp control shown when a fixture is clicked in the 3D scene.
 *
 * @param {{ entityId: string, entity: any, callService: Function, onClose: () => void, t: Function, x: number, y: number, placement?: 'above' | 'below', artKey?: string | null }} props
 */
function LampPopover({
  entityId,
  entity,
  callService,
  onClose,
  t,
  x,
  y,
  placement = 'above',
  artKey,
}) {
  const [optimistic, setOptimistic] = useState(null);
  const timer = useRef(null);

  const attrs = entity?.attributes || {};
  const name = attrs.friendly_name || entityId.split('.')[1]?.replace(/_/g, ' ') || entityId;
  const isOn = entity?.state === 'on';
  const dimmable = isDimmableLight(entity);
  const percent = optimistic ?? getBrightnessPercent(entity);
  const color = getLightColor(entity);
  const colorCss = `rgb(${color.r}, ${color.g}, ${color.b})`;

  const toggle = useCallback(() => {
    if (!callService) return;
    callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
  }, [callService, entityId, isOn]);

  const changeBrightness = useCallback(
    (event) => {
      if (!callService) return;
      const value = Math.round(Number(event?.target?.value));
      if (!Number.isFinite(value)) return;
      setOptimistic(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (value <= 0) callService('light', 'turn_off', { entity_id: entityId });
        else callService('light', 'turn_on', { entity_id: entityId, brightness_pct: value });
      }, SLIDER_DEBOUNCE_MS);
    },
    [callService, entityId]
  );

  useEffect(() => {
    if (optimistic === null) return;
    if (Math.abs(getBrightnessPercent(entity) - optimistic) <= 1) setOptimistic(null);
  }, [entity, optimistic]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    setOptimistic(null);
  }, [entityId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute z-30 w-60 max-w-[calc(100%-1rem)]"
      style={{
        left: x,
        top: y,
        transform: placement === 'below' ? 'translate(-50%,14%)' : 'translate(-50%,-112%)',
      }}
    >
      <div
        data-testid="house3d-lamp-popover"
        role="dialog"
        aria-label={name}
        className="popup-anim rounded-2xl border border-[var(--glass-border)] p-3 shadow-2xl"
        style={{ background: 'var(--modal-bg)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-start gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: isOn ? `rgba(${color.r}, ${color.g}, ${color.b}, 0.18)` : undefined,
              color: isOn ? colorCss : undefined,
            }}
          >
            {artKey ? (
              <DeviceArtImage artKey={artKey} className="h-7 w-7 object-contain" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {isOn ? `${percent}%` : t('roomExplorer.state.off') || 'Off'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
            aria-label={t('common.close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isOn}
            aria-label={name}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 ${
              isOn
                ? 'text-white shadow-md'
                : 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'
            }`}
            style={
              isOn
                ? {
                    background: colorCss,
                    boxShadow: `0 4px 12px rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`,
                  }
                : undefined
            }
          >
            <Power className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <M3Slider
              value={dimmable ? percent : isOn ? 100 : 0}
              onChange={changeBrightness}
              min={0}
              max={100}
              step={1}
              variant="thinLg"
              disabled={!dimmable}
              ariaLabel={t('house3d.brightness')}
              ariaValueText={`${percent}%`}
              colorClass={isOn ? 'bg-[var(--accent-color)]' : 'bg-[var(--text-muted)]'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(LampPopover);
