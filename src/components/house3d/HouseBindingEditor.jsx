import { memo, useMemo, useState } from 'react';
import {
  ChevronDown,
  Camera,
  DoorOpen,
  Lightbulb,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  WashingMachine,
  X,
} from '../../icons';
import DeviceArtImage from '../ui/DeviceArtImage';
import DeviceArtPicker from '../ui/DeviceArtPicker';
import { resolveEntityArtKey } from '../../config/deviceArt';
import {
  APPLIANCE_KEYS,
  addRoomEntity,
  getAlarmEntityId,
  getApplianceEntityId,
  getApplianceState,
  getDoorEntityId,
  getEntityName,
  getRoomEntityIds,
  isOpenState,
  listAlarmEntities,
  listApplianceEntities,
  listDoorEntities,
  removeRoomEntity,
  ROOM_ENTITY_DOMAINS,
  searchRoomEntities,
  setAlarmEntity,
  setApplianceEntity,
  setDoorEntity,
  splitDomain,
} from '../../utils/houseBindings';

const DOMAIN_LABELS = ROOM_ENTITY_DOMAINS;
const RESULT_LIMIT = 60;

function domainLabel(domain, t) {
  const key = `roomExplorer.domain.${domain}`;
  const translated = t(key);
  return translated !== key
    ? translated
    : domain.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const EntityRow = memo(
  /** @param {{ entityId: string, entity: any, action: import('react').ReactNode, artKey?: string | null, onChooseArt?: (entityId: string) => void }} props */
  function EntityRow({ entityId, entity, action, artKey, onChooseArt }) {
    const name = getEntityName(entity, entityId);
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2">
        {onChooseArt && (
          <button
            type="button"
            onClick={() => onChooseArt(entityId)}
            aria-label={name}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-bg-hover)] transition-colors hover:bg-[var(--glass-bg)]"
          >
            {artKey ? (
              <DeviceArtImage artKey={artKey} className="h-7 w-7 object-contain" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </button>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
            {name}
          </span>
          <span className="block truncate text-[10px] text-[var(--text-muted)]">{entityId}</span>
        </span>
        {entity && (
          <span className="shrink-0 rounded-full bg-[var(--glass-bg-hover)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
            {entity.state}
          </span>
        )}
        {action}
      </div>
    );
  }
);

/**
 * Manual device binding for the 3D house. Replaces the old area mapping: the
 * user picks the entities for each room and the sensor behind each door.
 *
 * @param {{ rooms: any[], doors: any[], bindings: { rooms: Record<string, string[]>, doors: Record<string, string>, alarm: string, appliances: Record<string, string> }, entities: Record<string, any>, initialRoomId?: string | null, initialTab?: string, onChange: Function, onClose: Function, t: Function }} props
 */
function HouseBindingEditor({
  rooms,
  doors,
  bindings,
  entities,
  customArt = {},
  saveCustomArt,
  initialRoomId = null,
  initialTab = 'rooms',
  onChange,
  onClose,
  t,
}) {
  const [tab, setTab] = useState(initialTab);
  const [activeRoomId, setActiveRoomId] = useState(() => initialRoomId || rooms[0]?.id || null);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const [artTarget, setArtTarget] = useState(null);

  const doorEntities = useMemo(() => listDoorEntities(entities), [entities]);
  const alarmEntities = useMemo(() => listAlarmEntities(entities), [entities]);
  const applianceEntities = useMemo(() => listApplianceEntities(entities), [entities]);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || rooms[0] || null;
  const boundIds = getRoomEntityIds(bindings, activeRoom?.id);

  const results = useMemo(() => {
    if (!activeRoom) return [];
    return searchRoomEntities(entities, {
      query,
      domain,
      exclude: boundIds,
    }).slice(0, RESULT_LIMIT);
  }, [activeRoom, entities, query, domain, boundIds]);

  const changeDomain = (value) => setDomain(value);
  const addEntity = (entityId) => onChange(addRoomEntity(bindings, activeRoom.id, entityId));
  const removeEntity = (entityId) => onChange(removeRoomEntity(bindings, activeRoom.id, entityId));

  const alarmEntityId = getAlarmEntityId(bindings);
  const alarmEntity = entities?.[alarmEntityId];
  const alarmState = alarmEntity?.state || '';
  const alarmTone =
    alarmState === 'triggered'
      ? 'bg-red-500/15 text-red-400'
      : alarmState.startsWith('armed_')
        ? 'bg-emerald-500/15 text-emerald-400'
        : ['arming', 'pending', 'disarming'].includes(alarmState)
          ? 'bg-amber-500/15 text-amber-400'
          : 'bg-[var(--glass-bg-hover)] text-[var(--text-muted)]';

  return (
    <div
      data-testid="house3d-binding-editor"
      className="absolute inset-0 z-30 flex flex-col bg-[var(--modal-bg)]/95 backdrop-blur-md"
    >
      <div className="flex items-start gap-2 border-b border-[var(--glass-border)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {t('house3d.bind.title')}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">{t('house3d.bind.hint')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--glass-border)] px-3 py-2">
        {[
          { id: 'rooms', label: t('house3d.bind.rooms'), icon: Lightbulb },
          { id: 'doors', label: t('house3d.bind.doors'), icon: DoorOpen },
          { id: 'alarm', label: t('house3d.bind.alarm'), icon: Shield },
          { id: 'laundry', label: t('house3d.bind.laundry'), icon: WashingMachine },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                tab === item.id
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'rooms' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap gap-1.5 px-3 py-2">
            {rooms.map((room) => {
              const count = getRoomEntityIds(bindings, room.id).length;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  aria-pressed={room.id === activeRoom?.id}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    room.id === activeRoom?.id
                      ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  {room.label}
                  {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-3 pb-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('house3d.bind.search')}
                aria-label={t('house3d.bind.search')}
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none"
              />
            </label>
            <div className="relative">
              <select
                value={domain}
                onChange={(event) => changeDomain(event.target.value)}
                aria-label={t('house3d.bind.domain')}
                className="appearance-none rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] py-1.5 pr-7 pl-2 text-[11px] text-[var(--text-primary)] outline-none"
              >
                <option value="all">{t('house3d.bind.allDomains')}</option>
                {DOMAIN_LABELS.map((value) => (
                  <option key={value} value={value}>
                    {domainLabel(value, t)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
            {boundIds.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 pt-1 text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">
                  {t('house3d.bind.linked')}
                </p>
                {boundIds.map((entityId) => (
                  <div key={entityId} className="space-y-1">
                    <EntityRow
                      entityId={entityId}
                      entity={entities?.[entityId]}
                      artKey={resolveEntityArtKey(entityId, entities?.[entityId], customArt)}
                      onChooseArt={() =>
                        setArtTarget((current) => (current === entityId ? null : entityId))
                      }
                      action={
                        <button
                          type="button"
                          onClick={() => removeEntity(entityId)}
                          aria-label={`${t('house3d.bind.remove')} ${getEntityName(entities?.[entityId], entityId)}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] transition-colors hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                    {artTarget === entityId && (
                      <div className="px-2 pb-1">
                        <DeviceArtPicker
                          entityId={entityId}
                          entity={entities?.[entityId]}
                          value={customArt?.[entityId]}
                          onChange={(artKey) => saveCustomArt?.(entityId, artKey)}
                          t={t}
                          defaultOpen
                          maxHeightClass="max-h-52"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="px-1 pt-2 text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">
              {t('house3d.bind.available')}
            </p>
            {results.length === 0 ? (
              <p className="px-1 py-3 text-[11px] text-[var(--text-muted)]">
                {t('house3d.bind.noResults')}
              </p>
            ) : (
              results.map(({ id, entity }) => (
                <EntityRow
                  key={id}
                  entityId={id}
                  entity={entity}
                  action={
                    <button
                      type="button"
                      onClick={() => addEntity(id)}
                      aria-label={`${t('house3d.bind.add')} ${getEntityName(entity, id)}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-[var(--accent-color)] transition-transform active:scale-90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>
      ) : tab === 'doors' ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <p className="px-1 text-[11px] text-[var(--text-muted)]">{t('house3d.bind.doorHint')}</p>
          {doors.map((door) => {
            const entityId = getDoorEntityId(bindings, door.id);
            const entity = entities?.[entityId];
            const open = isOpenState(entity?.state);
            const label = t(door.labelKey) === door.labelKey ? door.label : t(door.labelKey);
            return (
              <div
                key={door.id}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {label}
                    </p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      {entityId ? getEntityName(entity, entityId) : t('house3d.bind.none')}
                    </p>
                  </div>
                  {entityId && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        open
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-[var(--glass-bg-hover)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t(open ? 'house3d.door.open' : 'house3d.door.closed')}
                    </span>
                  )}
                </div>
                <select
                  value={entityId}
                  onChange={(event) =>
                    onChange(setDoorEntity(bindings, door.id, event.target.value))
                  }
                  aria-label={label}
                  className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                >
                  <option value="">{t('house3d.bind.none')}</option>
                  {doorEntities.map(({ id, entity: doorEntity }) => (
                    <option key={id} value={id}>
                      {getEntityName(doorEntity, id)}
                      {splitDomain(id) === 'binary_sensor' ? '' : ` (${id})`}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : tab === 'alarm' ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <p className="px-1 text-[11px] text-[var(--text-muted)]">{t('house3d.bind.alarmHint')}</p>
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2">
            <div className="flex items-center gap-2">
              {alarmState === 'triggered' ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {t('house3d.bind.alarm')}
                </p>
                <p className="truncate text-[10px] text-[var(--text-muted)]">
                  {alarmEntityId
                    ? getEntityName(alarmEntity, alarmEntityId)
                    : t('house3d.bind.none')}
                </p>
              </div>
              {alarmEntityId && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${alarmTone}`}
                >
                  {t(`alarm.state.${alarmState}`) === `alarm.state.${alarmState}`
                    ? alarmState
                    : t(`alarm.state.${alarmState}`)}
                </span>
              )}
            </div>
          </div>
          <select
            value={alarmEntityId}
            onChange={(event) => onChange(setAlarmEntity(bindings, event.target.value))}
            aria-label={t('house3d.bind.alarm')}
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
          >
            <option value="">{t('house3d.bind.none')}</option>
            {alarmEntities.map(({ id, entity }) => (
              <option key={id} value={id}>
                {getEntityName(entity, id)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          <p className="px-1 text-[11px] text-[var(--text-muted)]">
            {t('house3d.bind.laundryHint')}
          </p>
          {APPLIANCE_KEYS.map((key) => {
            const entityId = getApplianceEntityId(bindings, key);
            const entity = entities?.[entityId];
            const state = getApplianceState(bindings, key, entities);
            const label = t(`house3d.bind.${key}`);
            return (
              <div
                key={key}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <WashingMachine className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {label}
                    </p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      {entityId ? getEntityName(entity, entityId) : t('house3d.bind.none')}
                    </p>
                  </div>
                  {entityId && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        state.running
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-[var(--glass-bg-hover)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t(state.running ? 'house3d.appliance.running' : 'house3d.appliance.idle')}
                      {state.power !== null ? ` · ${Math.round(state.power)} W` : ''}
                    </span>
                  )}
                </div>
                <select
                  value={entityId}
                  onChange={(event) =>
                    onChange(setApplianceEntity(bindings, key, event.target.value))
                  }
                  aria-label={label}
                  className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                >
                  <option value="">{t('house3d.bind.none')}</option>
                  {applianceEntities.map(({ id, entity: applianceEntity }) => (
                    <option key={id} value={id}>
                      {getEntityName(applianceEntity, id)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(HouseBindingEditor);
