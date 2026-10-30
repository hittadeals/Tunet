import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Clock, Layers, Power, Sun, X, Zap } from '../../icons';
import M3Slider from '../ui/M3Slider';

const TIMER_OPTIONS = [15, 30, 60];
const PRESET_OPTIONS = [25, 50, 100];
const MEMBER_SLIDER_DEBOUNCE_MS = 180;

/**
 * Quick actions for a light, or member controls for a light group.
 *
 * @param {{ open: boolean, mode?: 'quick' | 'group', name: string, entityId: string, entity?: any, members?: any[], callService: Function, optimisticLightBrightness?: Record<string, number>, setOptimisticLightBrightness?: Function, onClose: () => void, onDetails?: () => void, onShowGroup?: () => void, t: Function }} props
 */
export default function LightQuickSheet({
  open,
  mode = 'quick',
  name,
  entityId,
  entity,
  members = [],
  callService,
  optimisticLightBrightness = {},
  setOptimisticLightBrightness,
  onClose,
  onDetails,
  onShowGroup,
  t,
}) {
  const [optimistic, setOptimistic] = useState({});
  const [timerMinutes, setTimerMinutes] = useState(null);
  const timerRef = useRef(null);
  const memberTimersRef = useRef({});

  useEffect(() => {
    if (!open) setOptimistic({});
  }, [open]);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      Object.values(memberTimersRef.current).forEach((handle) => clearTimeout(handle));
    },
    []
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isGroup = mode === 'group';
  const title = isGroup ? t('light.groupMembers') : t('light.quickActions');
  const isOn = entity?.state === 'on';
  const applyBrightness = (percent) => {
    const value = Math.round((percent / 100) * 255);
    setOptimistic((previous) => ({ ...previous, [entityId]: value }));
    setOptimisticLightBrightness?.((previous) => ({ ...previous, [entityId]: value }));
    callService('light', 'turn_on', { entity_id: entityId, brightness: value });
  };

  const applyTimer = (minutes) => {
    clearTimeout(timerRef.current);
    if (!minutes) {
      timerRef.current = null;
      setTimerMinutes(null);
      return;
    }
    setTimerMinutes(minutes);
    timerRef.current = setTimeout(() => {
      callService('light', 'turn_off', { entity_id: entityId });
      setTimerMinutes(null);
    }, minutes * 60 * 1000);
  };

  const toggleMember = (member) => {
    const memberIsOn = member.state === 'on';
    setOptimistic((previous) => ({ ...previous, [member.entity_id]: !memberIsOn }));
    callService('light', memberIsOn ? 'turn_off' : 'turn_on', {
      entity_id: member.entity_id,
    });
  };

  const changeMemberBrightness = (member, value) => {
    setOptimistic((previous) => ({ ...previous, [member.entity_id]: value }));
    clearTimeout(memberTimersRef.current[member.entity_id]);
    memberTimersRef.current[member.entity_id] = setTimeout(() => {
      callService('light', 'turn_on', {
        entity_id: member.entity_id,
        brightness: value,
      });
    }, MEMBER_SLIDER_DEBOUNCE_MS);
  };

  const setAllMembers = (on) => {
    members.forEach((member) => {
      if (member.state === 'unavailable' || member.state === 'unknown') return;
      callService('light', on ? 'turn_on' : 'turn_off', {
        entity_id: member.entity_id,
      });
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="popup-anim max-h-[82vh] w-full overflow-y-auto rounded-3xl border border-[var(--surface-border)] p-4 shadow-2xl sm:max-w-md"
        style={{ backgroundColor: 'var(--modal-bg)' }}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="card-eyebrow">{title}</p>
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">{name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isGroup ? (
          <>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAllMembers(true)}
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-bg)] text-[11px] font-bold text-[var(--accent-color)]"
              >
                <Power className="h-3.5 w-3.5" />
                {t('lights.allOn')}
              </button>
              <button
                type="button"
                onClick={() => setAllMembers(false)}
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--glass-bg)] text-[11px] font-bold text-[var(--text-secondary)]"
              >
                <Power className="h-3.5 w-3.5" />
                {t('lights.allOff')}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {members.map((member) => {
                const memberValue =
                  optimistic[member.entity_id] ??
                  optimisticLightBrightness[member.entity_id] ??
                  member.attributes?.brightness ??
                  0;
                const memberIsOn = optimistic[member.entity_id] ?? member.state === 'on';
                const unavailable =
                  member.state === 'unavailable' || member.state === 'unknown';
                return (
                  <div
                    key={member.entity_id}
                    className="rounded-2xl border border-[var(--surface-border)] bg-[var(--glass-bg)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: memberIsOn
                            ? 'var(--domain-light)'
                            : 'var(--text-muted)',
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">
                        {member.attributes?.friendly_name ||
                          member.entity_id.split('.')[1]?.replace(/_/g, ' ')}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(memberIsOn)}
                        aria-label={`${member.attributes?.friendly_name || member.entity_id}: ${
                          memberIsOn ? t('common.off') : t('common.on')
                        }`}
                        disabled={unavailable}
                        onClick={() => toggleMember(member)}
                        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
                          memberIsOn
                            ? 'border-transparent bg-[var(--domain-light)]'
                            : 'border-[var(--surface-border)] bg-[var(--glass-bg-hover)]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform ${
                            memberIsOn ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="mt-2">
                      <M3Slider
                        variant="level"
                        min={0}
                        max={255}
                        step={1}
                        value={memberValue}
                        disabled={unavailable}
                        onChange={(event) =>
                          changeMemberBrightness(member, parseInt(event.target.value))
                        }
                        colorClass="bg-[var(--domain-light)]"
                        ariaLabel={`${
                          member.attributes?.friendly_name || member.entity_id
                        } ${t('light.brightness')}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                <Sun className="h-3 w-3" />
                {t('light.brightness')}
              </p>
              <div className="flex gap-2">
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyBrightness(preset)}
                    className="min-h-10 flex-1 rounded-xl border border-[var(--surface-border)] bg-[var(--glass-bg)] text-xs font-bold tabular-nums text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                <Clock className="h-3 w-3" />
                {t('light.timer')}
              </p>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => applyTimer(timerMinutes === minutes ? null : minutes)}
                    className={`min-h-10 flex-1 rounded-xl border text-xs font-bold tabular-nums transition-colors ${
                      timerMinutes === minutes
                        ? 'border-transparent bg-[var(--accent-bg)] text-[var(--accent-color)]'
                        : 'border-[var(--surface-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'
                    }`}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  callService('light', 'turn_on', { entity_id: entityId, flash: 'short' })
                }
                className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--surface-border)] bg-[var(--glass-bg)] px-3 text-[11px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <Zap className="h-3.5 w-3.5" />
                {t('light.flash')}
              </button>
              {members.length > 0 && onShowGroup && (
                <button
                  type="button"
                  onClick={onShowGroup}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--surface-border)] bg-[var(--glass-bg)] px-3 text-[11px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  {t('light.groupMembers')}
                </button>
              )}
              {onDetails && (
                <button
                  type="button"
                  onClick={onDetails}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-bg)] px-3 text-[11px] font-bold text-[var(--accent-color)]"
                >
                  {t('sensor.action.details')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {isOn && (
              <p className="mt-3 text-center text-[10px] text-[var(--text-muted)]">
                {t('common.on')} ·{' '}
                {Math.round(
                  ((optimistic[entityId] ??
                    optimisticLightBrightness[entityId] ??
                    entity?.attributes?.brightness ??
                    0) /
                    255) *
                    100
                )}
                %
              </p>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
