import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Droplets,
  Lightbulb,
  Lock,
  Plus,
  Power,
  Thermometer,
  X,
} from '../../icons';
import M3Slider from '../ui/M3Slider';
import DeviceArtImage from '../ui/DeviceArtImage';
import {
  getBrightnessPercent,
  getLightColor,
  isDimmableLight,
} from '../../utils/houseScene';
import { resolveEntityArtKey } from '../../config/deviceArt';

const SLIDER_DEBOUNCE_MS = 200;

function domainLabel(domain, t) {
  const key = `roomExplorer.domain.${domain}`;
  const translated = t(key);
  return translated !== key
    ? translated
    : domain.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const Section = memo(
  /** @param {{ title: string, count: number, children: import('react').ReactNode }} props */
  function Section({ title, count, children }) {
  const [open, setOpen] = useState(true);
  if (!count) return null;
  return (
    <div className="border-t border-[var(--glass-border)] pt-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">
          {title}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">{count}</span>
        <span className="flex-1" />
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="space-y-1.5">{children}</div>}
    </div>
  );
});

const LightRow = memo(
  /** @param {{ entityId: string, entity: any, callService: Function, t: Function }} props */
  function LightRow({ entityId, entity, artKey, callService, t }) {
  const [optimistic, setOptimistic] = useState(null);
  const timer = useRef(null);
  const attrs = entity?.attributes || {};
  const name = attrs.friendly_name || entityId.split('.')[1]?.replace(/_/g, ' ');
  const isOn = entity?.state === 'on';
  const dimmable = isDimmableLight(entity);
  const percent = optimistic ?? getBrightnessPercent(entity);
  const color = getLightColor(entity);

  const toggle = useCallback(() => {
    if (!callService) return;
    callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
  }, [callService, entityId, isOn]);

  // M3Slider reports an input event, not the raw value.
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

  // Drop the optimistic value once Home Assistant reports the new brightness,
  // so the slider never snaps back to the old level after a change.
  useEffect(() => {
    if (optimistic === null) return;
    if (Math.abs(getBrightnessPercent(entity) - optimistic) <= 1) setOptimistic(null);
  }, [entity, optimistic]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="rounded-2xl bg-[var(--glass-bg)] px-3 py-2">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: isOn ? `rgba(${color.r}, ${color.g}, ${color.b}, 0.18)` : undefined,
            color: isOn ? `rgb(${color.r}, ${color.g}, ${color.b})` : undefined,
          }}
        >
          {artKey ? (
            <DeviceArtImage artKey={artKey} className="h-6 w-6 object-contain" />
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
          onClick={toggle}
          aria-pressed={isOn}
          aria-label={name}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 ${
            isOn
              ? 'text-white shadow-md'
              : 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'
          }`}
          style={
            isOn
              ? {
                  background: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  boxShadow: `0 4px 12px rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`,
                }
              : undefined
          }
        >
          <Power className="h-4 w-4" />
        </button>
      </div>
      {dimmable && isOn && (
        <div className="mt-2 pl-10">
          <M3Slider
            value={percent}
            onChange={changeBrightness}
            min={0}
            max={100}
            step={1}
            variant="thinLg"
          />
        </div>
      )}
    </div>
  );
});

const SensorRow = memo(
  /** @param {{ entityId: string, entity: any }} props */
  function SensorRow({ entityId, entity, artKey }) {
  const attrs = entity?.attributes || {};
  const name = attrs.friendly_name || entityId.split('.')[1]?.replace(/_/g, ' ');
  const unit = attrs.unit_of_measurement || '';
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-[var(--glass-bg-hover)]">
      {artKey && <DeviceArtImage artKey={artKey} className="h-6 w-6 shrink-0 object-contain" />}
      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
        {name}
      </span>
      <span className="text-xs font-semibold text-[var(--text-primary)]">
        {entity?.state}
        {unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
});

export default memo(
  /**
   * @param {{ room: any, entityIds: string[], entities: Record<string, any>, callService: Function, onAddDevices?: Function, onClose: () => void, t: Function }} props
   */
  function RoomPanel({
  room,
  entityIds,
  entities,
  callService,
  customArt,
  onAddDevices,
  onClose,
  t,
}) {
  const groups = useMemo(() => {
    const result = {
      light: [],
      climate: [],
      sensor: [],
      binary_sensor: [],
      cover: [],
      switch: [],
      fan: [],
      lock: [],
    };
    (entityIds || []).forEach((id) => {
      const entity = entities?.[id];
      if (!entity) return;
      const domain = id.split('.')[0];
      if (!result[domain]) result[domain] = [];
      result[domain].push({ id, entity });
    });
    return result;
  }, [entityIds, entities]);

  const total = (entityIds || []).length;
  const artFor = (id) => resolveEntityArtKey(id, entities?.[id], customArt);

  return (
    <aside
      data-testid="house3d-room-panel"
      className="popup-anim pointer-events-auto flex max-h-[58%] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--glass-border)] shadow-2xl lg:absolute lg:top-4 lg:right-4 lg:bottom-4 lg:max-h-none lg:w-[350px] lg:rounded-3xl"
      style={{ background: 'var(--modal-bg)', backdropFilter: 'blur(20px)' }}
      aria-label={room.label}
    >
      <div className="flex items-start gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-[var(--text-primary)]">{room.label}</h2>
          <p className="text-[10px] tracking-wide text-[var(--text-muted)]">
            {total} {t('roomExplorer.entities')}
          </p>
        </div>
        {onAddDevices && (
          <button
            type="button"
            onClick={() => onAddDevices(room.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent-bg)] px-2.5 py-2 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('house3d.bind.addDevices')}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <Section title={t('house3d.lights')} count={groups.light.length}>
          {groups.light.map(({ id, entity }) => (
            <LightRow
              key={id}
              entityId={id}
              entity={entity}
              artKey={artFor(id)}
              callService={callService}
              t={t}
            />
          ))}
        </Section>

        <Section title={t('roomExplorer.domain.climate')} count={groups.climate.length}>
          {groups.climate.map(({ id, entity }) => {
            const attrs = entity.attributes || {};
            const unit = attrs.temperature_unit || '°';
            return (
              <div key={id} className="flex items-center gap-2.5 rounded-2xl bg-[var(--glass-bg)] px-3 py-2">
                <Thermometer className="h-4 w-4 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {attrs.friendly_name || id}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {attrs.current_temperature ?? '–'}
                    {unit} → {attrs.temperature ?? '–'}
                    {unit} · {attrs.hvac_action || entity.state}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    callService('climate', entity.state === 'off' ? 'turn_on' : 'turn_off', {
                      entity_id: id,
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] transition-all active:scale-90"
                  aria-label={attrs.friendly_name || id}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </Section>

        <Section title={domainLabel('cover', t)} count={groups.cover.length}>
          {groups.cover.map(({ id, entity }) => (
            <div key={id} className="flex items-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
                {entity.attributes?.friendly_name || id}
              </span>
              {[
                { service: 'open_cover', label: '▲' },
                { service: 'stop_cover', label: '■' },
                { service: 'close_cover', label: '▼' },
              ].map(({ service, label }) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => callService('cover', service, { entity_id: id })}
                  className="h-7 w-7 rounded-lg bg-[var(--glass-bg-hover)] text-[10px] text-[var(--text-secondary)] transition-all active:scale-90"
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </Section>

        <Section title={domainLabel('lock', t)} count={groups.lock.length}>
          {groups.lock.map(({ id, entity }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                callService('lock', entity.state === 'locked' ? 'unlock' : 'lock', {
                  entity_id: id,
                })
              }
              className="flex w-full items-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-left"
            >
              <Lock className="h-4 w-4 text-indigo-400" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
                {entity.attributes?.friendly_name || id}
              </span>
              <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                {entity.state}
              </span>
            </button>
          ))}
        </Section>

        <Section title={t('roomExplorer.domain.switch')} count={groups.switch.length + groups.fan.length}>
          {[...groups.switch, ...groups.fan].map(({ id, entity }) => {
            const domain = id.split('.')[0];
            const isOn = entity.state === 'on';
            return (
              <div key={id} className="flex items-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
                  {entity.attributes?.friendly_name || id}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    callService(domain, isOn ? 'turn_off' : 'turn_on', { entity_id: id })
                  }
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-90 ${
                    isOn
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'
                  }`}
                  aria-label={entity.attributes?.friendly_name || id}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </Section>

        <Section
          title={t('house3d.sensors')}
          count={groups.sensor.length + groups.binary_sensor.length}
        >
          {[...groups.sensor, ...groups.binary_sensor]
            .sort((a, b) => {
              const aTemp = a.entity.attributes?.device_class === 'temperature' ? -1 : 0;
              const bTemp = b.entity.attributes?.device_class === 'temperature' ? -1 : 0;
              return aTemp - bTemp;
            })
            .map(({ id, entity }) => (
              <SensorRow key={id} entityId={id} entity={entity} artKey={artFor(id)} />
            ))}
        </Section>

        {total === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Droplets className="h-6 w-6 text-[var(--text-muted)] opacity-50" />
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              {t('house3d.emptyRoom')}
            </p>
            {onAddDevices && (
              <button
                type="button"
                onClick={() => onAddDevices(room.id)}
                className="mt-1 flex items-center gap-1.5 rounded-xl bg-[var(--accent-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase transition-transform active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('house3d.bind.addDevices')}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
});
