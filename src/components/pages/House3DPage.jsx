import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  Camera,
  DoorOpen,
  Eye,
  EyeOff,
  Home,
  Lightbulb,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  WashingMachine,
} from '../../icons';
import RoomPanel from '../house3d/RoomPanel';
import LampPopover from '../house3d/LampPopover';
import HouseBindingEditor from '../house3d/HouseBindingEditor';
import { HouseScene } from '../../utils/houseScene3d';
import { getRoomStats } from '../../utils/houseScene';
import {
  countBoundDevices,
  getAlarmInfo,
  getApplianceStates,
  getDoorStates,
  getRoomEntityIds,
  getRoomLightEntityIds,
  normalizeHouseBindings,
} from '../../utils/houseBindings';
import {
  HOUSE_DOORS,
  HOUSE_FLOORS,
  HOUSE_OPENINGS,
  HOUSE_ROOF,
  HOUSE_ROOMS,
  HOUSE_WINDOWS,
} from '../../config/houseModel';
import { HOUSE_FURNITURE } from '../../config/houseFurniture';
import { resolveEntityArtKey } from '../../config/deviceArt';

const FLOOR_OPTIONS = [
  ...HOUSE_FLOORS.map((floor) => ({
    id: floor.id,
    labelKey: floor.labelKey,
    fallback: floor.label,
  })),
  { id: 'all', labelKey: 'house3d.floor.all', fallback: 'Alla plan' },
];

const VIEW_PRESETS = [
  { id: 'overview', labelKey: 'house3d.view.overview' },
  { id: 'top', labelKey: 'house3d.view.top' },
  { id: 'entrance', labelKey: 'house3d.view.entrance' },
  { id: 'garden', labelKey: 'house3d.view.garden' },
];

function supportsWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function formatStatsLabel(stats) {
  if (!stats) return '';
  const parts = [];
  if (stats.temperature !== null) parts.push(`${stats.temperature}°`);
  if (stats.humidity !== null) parts.push(`${stats.humidity}%`);
  if (parts.length === 0 && stats.lightsTotal > 0) {
    parts.push(`${stats.lightsOn}/${stats.lightsTotal}`);
  }
  return parts.join(' · ');
}

/**
 * @param {{ entities: Record<string, any>, callService: Function, pageSettings: Record<string, any>, pageId: string, savePageSetting: Function, t: Function }} props
 */
function House3DPage({
  entities,
  callService,
  pageSettings,
  pageId,
  savePageSetting,
  customArt = {},
  saveCustomArt,
  t,
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showBindings, setShowBindings] = useState(false);
  const [bindingRoomId, setBindingRoomId] = useState(null);
  const [bindingTab, setBindingTab] = useState('rooms');
  const [webglOk] = useState(supportsWebGL);
  const [floor, setFloor] = useState(() => pageSettings?.[pageId]?.houseFloor || 'ground');
  const [showLabels, setShowLabels] = useState(() => pageSettings?.[pageId]?.houseLabels === true);
  const [roofVisible, setRoofVisible] = useState(() => pageSettings?.[pageId]?.houseRoof === true);
  const [exploded, setExploded] = useState(false);
  const [showArt, setShowArt] = useState(() => pageSettings?.[pageId]?.houseArt !== false);
  const [lampTarget, setLampTarget] = useState(null);

  const canvasRef = useRef(null);
  const labelsRef = useRef(null);
  const stageRef = useRef(null);
  const panelRef = useRef(null);
  const controllerRef = useRef(null);
  const callbacksRef = useRef(/** @type {any} */ ({}));

  const bindings = useMemo(
    () => normalizeHouseBindings(pageSettings?.[pageId]?.houseBindings),
    [pageSettings, pageId]
  );

  const doorStates = useMemo(
    () => getDoorStates(HOUSE_DOORS, bindings, entities),
    [bindings, entities]
  );

  const alarm = useMemo(() => getAlarmInfo(bindings, entities), [bindings, entities]);
  const applianceStates = useMemo(
    () => getApplianceStates(bindings, entities),
    [bindings, entities]
  );

  const roomEntityIds = bindings.rooms;

  const roomLights = useMemo(() => {
    const result = {};
    HOUSE_ROOMS.forEach((room) => {
      result[room.id] = getRoomLightEntityIds(bindings, room.id);
    });
    return result;
  }, [bindings]);

  const roomArt = useMemo(() => {
    const result = {};
    HOUSE_ROOMS.forEach((room) => {
      result[room.id] = getRoomEntityIds(bindings, room.id)
        .map((id) => ({
          entityId: id,
          artKey: resolveEntityArtKey(id, entities?.[id], customArt),
        }))
        .filter((item) => item.artKey)
        .slice(0, 3);
    });
    return result;
  }, [bindings, entities, customArt]);

  const roomStats = useMemo(
    () => getRoomStats(HOUSE_ROOMS, roomEntityIds, entities),
    [roomEntityIds, entities]
  );

  const selectedRoom = HOUSE_ROOMS.find((room) => room.id === selectedRoomId) || null;

  const totalLightsOn = useMemo(
    () => Object.values(roomStats).reduce((sum, stats) => sum + stats.lightsOn, 0),
    [roomStats]
  );

  const linkedRoomCount = useMemo(
    () => HOUSE_ROOMS.filter((room) => getRoomEntityIds(bindings, room.id).length > 0).length,
    [bindings]
  );

  const boundDeviceCount = useMemo(() => countBoundDevices(bindings), [bindings]);

  const openDoorCount = useMemo(
    () => Object.values(doorStates).filter(Boolean).length,
    [doorStates]
  );

  const alarmLabelKey = `alarm.state.${alarm.state}`;
  const translatedAlarm = alarm.entityId ? t(alarmLabelKey) : t('house3d.bind.none');
  const alarmLabel = translatedAlarm === alarmLabelKey ? alarm.state : translatedAlarm;
  const AlarmIcon = alarm.triggered
    ? Siren
    : alarm.pending
      ? ShieldAlert
      : alarm.armed
        ? ShieldCheck
        : Shield;
  const alarmTone = alarm.triggered
    ? 'bg-red-500/15 text-red-400 animate-pulse'
    : alarm.pending
      ? 'bg-amber-500/15 text-amber-400'
      : alarm.armed
        ? alarm.state === 'armed_away'
          ? 'bg-sky-500/15 text-sky-400'
          : 'bg-emerald-500/15 text-emerald-400'
        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';
  const laundryChips = ['washer', 'dryer']
    .map((key) => ({ key, ...applianceStates[key] }))
    .filter((item) => item.entityId);

  const selectRoom = useCallback((roomId) => {
    setSelectedRoomId(roomId);
    setLampTarget(null);
  }, []);

  const selectLight = useCallback((entityId, point) => {
    const stage = stageRef.current;
    const width = stage?.clientWidth || 0;
    const height = stage?.clientHeight || 0;
    const pointerX = point?.x ?? width / 2;
    const pointerY = point?.y ?? height / 2;
    // Open the lamp controls below the fixture when it sits near the top of
    // the viewport, so the popover never gets clipped by the stage.
    const placement = pointerY < 190 ? 'below' : 'above';
    setSelectedRoomId(null);
    setLampTarget({
      entityId,
      placement,
      x: Math.max(124, Math.min(Math.max(124, width - 124), pointerX)),
      y: placement === 'below' ? Math.max(8, pointerY) : Math.min(height - 8, pointerY),
    });
  }, []);

  const changeBindings = useCallback(
    (next) => {
      savePageSetting?.(pageId, 'houseBindings', normalizeHouseBindings(next));
    },
    [pageId, savePageSetting]
  );

  const openBindings = useCallback((roomId = null, tab = 'rooms') => {
    setLampTarget(null);
    setBindingRoomId(roomId);
    setBindingTab(tab);
    setShowBindings(true);
  }, []);

  const closeBindings = useCallback(() => {
    setShowBindings(false);
    setBindingRoomId(null);
    setBindingTab('rooms');
  }, []);

  useEffect(() => {
    callbacksRef.current = {
      onSelectRoom: selectRoom,
      onSelectLight: selectLight,
      getOffLabel: () => t('roomExplorer.state.off') || 'Off',
      formatStats: formatStatsLabel,
    };
  }, [selectRoom, selectLight, t]);

  useEffect(() => {
    if (!webglOk || !canvasRef.current || !labelsRef.current) return undefined;

    const scene = new HouseScene({
      canvas: canvasRef.current,
      labelHost: labelsRef.current,
      rooms: HOUSE_ROOMS,
      floors: HOUSE_FLOORS,
      openings: HOUSE_OPENINGS,
      windows: HOUSE_WINDOWS,
      doors: HOUSE_DOORS,
      doorStates,
      alarmState: alarm.state,
      applianceStates,
      furniture: HOUSE_FURNITURE,
      roof: HOUSE_ROOF,
      onSelectRoom: (roomId) => callbacksRef.current.onSelectRoom?.(roomId),
      onSelectLight: (entityId, point) => callbacksRef.current.onSelectLight?.(entityId, point),
      getOffLabel: () => callbacksRef.current.getOffLabel?.() || 'Off',
      formatStats: (stats) => callbacksRef.current.formatStats?.(stats) || '',
    });
    controllerRef.current = scene;

    return () => {
      scene.dispose();
      controllerRef.current = null;
    };
    // The scene is built once; live data is pushed through the setters below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglOk]);

  useEffect(() => {
    if (lampTarget && !entities?.[lampTarget.entityId]) setLampTarget(null);
  }, [entities, lampTarget]);

  const sunElevation = entities?.['sun.sun']?.attributes?.elevation;
  const sunAzimuth = entities?.['sun.sun']?.attributes?.azimuth;

  useEffect(() => {
    controllerRef.current?.setSunState(sunElevation, sunAzimuth);
  }, [sunElevation, sunAzimuth]);

  const roofInitializedRef = useRef(false);

  useEffect(() => {
    const scene = controllerRef.current;
    if (!scene) return;
    scene.setRoofVisible(roofVisible);
    if (!roofInitializedRef.current) {
      roofInitializedRef.current = true;
      if (roofVisible) scene.setViewPreset('overview');
      return;
    }
    scene.setViewPreset('overview');
  }, [roofVisible]);

  useEffect(() => {
    controllerRef.current?.setExploded(exploded);
  }, [exploded]);

  useEffect(() => {
    controllerRef.current?.setRoomLights(roomLights);
  }, [roomLights]);

  useEffect(() => {
    controllerRef.current?.setRoomArt(roomArt);
  }, [roomArt]);

  useEffect(() => {
    controllerRef.current?.setShowArt(showArt);
  }, [showArt]);

  useEffect(() => {
    controllerRef.current?.setEntities(entities);
  }, [entities]);

  useEffect(() => {
    controllerRef.current?.setDoorStates(doorStates);
  }, [doorStates]);

  useEffect(() => {
    controllerRef.current?.setAlarmState(alarm.state);
  }, [alarm.state]);

  useEffect(() => {
    controllerRef.current?.setApplianceStates(applianceStates);
  }, [applianceStates]);

  useEffect(() => {
    controllerRef.current?.setRoomStats(roomStats);
  }, [roomStats]);

  useEffect(() => {
    controllerRef.current?.setSelectedRoom(selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
    controllerRef.current?.setVisibleFloor(floor);
  }, [floor]);

  useEffect(() => {
    controllerRef.current?.setShowLabels(showLabels);
  }, [showLabels]);

  useEffect(() => {
    if (floor === 'all' || !selectedRoom) return;
    if (selectedRoom.floor !== floor) setSelectedRoomId(null);
  }, [floor, selectedRoom]);

  useEffect(() => {
    if (!selectedRoomId || !panelRef.current) return;
    const isMobile = window.matchMedia?.('(max-width: 1023px)').matches;
    if (isMobile) panelRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [selectedRoomId]);

  const changeFloor = useCallback(
    (value) => {
      setLampTarget(null);
      setFloor(value);
      savePageSetting?.(pageId, 'houseFloor', value);
    },
    [pageId, savePageSetting]
  );

  const toggleLabels = useCallback(() => {
    setShowLabels((value) => {
      savePageSetting?.(pageId, 'houseLabels', !value);
      return !value;
    });
  }, [pageId, savePageSetting]);

  const toggleRoof = useCallback(() => {
    const next = !roofVisible;
    savePageSetting?.(pageId, 'houseRoof', next);
    setRoofVisible(next);
    if (next) setExploded(false);
  }, [roofVisible, pageId, savePageSetting]);

  const toggleExploded = useCallback(() => {
    const next = !exploded;
    setExploded(next);
    if (next && roofVisible) {
      setRoofVisible(false);
      savePageSetting?.(pageId, 'houseRoof', false);
    }
  }, [exploded, roofVisible, pageId, savePageSetting]);

  const toggleShowArt = useCallback(() => {
    setShowArt((value) => {
      savePageSetting?.(pageId, 'houseArt', !value);
      return !value;
    });
  }, [pageId, savePageSetting]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pt-4 pb-24 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--accent-color)]">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {t('house3d.title')}
          </h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            {linkedRoomCount}/{HOUSE_ROOMS.length} {t('house3d.roomsMapped')} · {boundDeviceCount}{' '}
            {t('house3d.devicesLinked')} · {totalLightsOn} {t('roomExplorer.lightsOn')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FLOOR_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeFloor(option.id)}
              className={`rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                floor === option.id
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
            >
              {t(option.labelKey) === option.labelKey ? option.fallback : t(option.labelKey)}
            </button>
          ))}
        </div>

        {webglOk && (
          <div className="flex flex-wrap gap-1.5">
            {VIEW_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => controllerRef.current?.setViewPreset(preset.id)}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
              >
                {t(preset.labelKey)}
              </button>
            ))}
          </div>
        )}

        <span className="flex-1" />

        <button
          type="button"
          onClick={toggleLabels}
          aria-pressed={showLabels}
          className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
            showLabels
              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
          }`}
        >
          {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {t('house3d.labels')}
        </button>

        <button
          type="button"
          onClick={() => (showBindings ? closeBindings() : openBindings())}
          aria-pressed={showBindings}
          className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
            showBindings || boundDeviceCount === 0
              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('house3d.devices')}
        </button>

        {webglOk && (
          <>
            <button
              type="button"
              onClick={() => controllerRef.current?.resetView()}
              className="flex items-center gap-1.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('house3d.resetView')}
            </button>
            <button
              type="button"
              onClick={toggleRoof}
              aria-pressed={roofVisible}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                roofVisible
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              {t('house3d.roof')}
            </button>
            <button
              type="button"
              onClick={toggleExploded}
              aria-pressed={exploded}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                exploded
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
              }`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {t('house3d.explode')}
            </button>
            <button
              type="button"
              onClick={toggleShowArt}
              aria-pressed={showArt}
              title={t('deviceArt.showIn3d')}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
                showArt
                  ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              {t('deviceArt.title')}
            </button>
          </>
        )}
      </div>

      <div
        ref={stageRef}
        className="relative h-[54vh] min-h-[340px] overflow-hidden rounded-3xl border border-[var(--glass-border)] sm:h-[62vh] sm:min-h-[420px]"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, var(--glass-bg) 0%, transparent 60%), var(--card-bg)',
        }}
      >
        {webglOk ? (
          <>
            <canvas
              ref={canvasRef}
              data-testid="house3d-canvas"
              className="absolute inset-0 h-full w-full touch-none select-none"
            />
            <div
              ref={labelsRef}
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
            />
          </>
        ) : (
          <div className="absolute inset-0 overflow-y-auto p-4">
            <div className="mb-3 rounded-2xl bg-[var(--glass-bg)] p-3">
              <p className="text-xs font-bold text-[var(--text-primary)]">{t('house3d.noWebgl')}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {t('house3d.noWebglHint')}
              </p>
            </div>
            {boundDeviceCount === 0 && !showBindings && (
              <button
                type="button"
                onClick={() => openBindings()}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 py-2 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase transition-transform active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('house3d.bind.emptyHint')}
              </button>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {HOUSE_ROOMS.filter((room) => floor === 'all' || room.floor === floor).map((room) => {
                const stats = roomStats[room.id];
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className="flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    <Lightbulb
                      className={`h-4 w-4 ${
                        stats?.lightsOn > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-primary)]">
                      {room.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {stats?.temperature ?? ''}
                      {stats?.temperature != null ? '°' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {lampTarget && entities?.[lampTarget.entityId] && (
          <LampPopover
            entityId={lampTarget.entityId}
            entity={entities[lampTarget.entityId]}
            artKey={resolveEntityArtKey(
              lampTarget.entityId,
              entities[lampTarget.entityId],
              customArt
            )}
            callService={callService}
            onClose={() => setLampTarget(null)}
            t={t}
            x={lampTarget.x}
            y={lampTarget.y}
            placement={lampTarget.placement}
          />
        )}

        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase backdrop-blur">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
          {totalLightsOn} {t('roomExplorer.lightsOn')}
        </div>

        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
          {alarm.entityId && (
            <button
              type="button"
              onClick={() => openBindings(null, 'alarm')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase backdrop-blur transition-transform active:scale-95 ${alarmTone}`}
            >
              <AlarmIcon className="h-3.5 w-3.5" />
              {alarmLabel}
            </button>
          )}

          {openDoorCount > 0 && (
            <div className="pointer-events-none flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold tracking-widest text-amber-400 uppercase backdrop-blur">
              <DoorOpen className="h-3.5 w-3.5" />
              {openDoorCount} {t('house3d.openDoors')}
            </div>
          )}

          {laundryChips.map(({ key, running, power }) => (
            <button
              key={key}
              type="button"
              onClick={() => openBindings(null, 'laundry')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase backdrop-blur transition-transform active:scale-95 ${
                running
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
              }`}
            >
              {running ? (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <WashingMachine className="h-3.5 w-3.5" />
              )}
              {t(`house3d.appliance.${key}`)}
              {running && power !== null
                ? ` · ${t('house3d.appliance.watts').replace('{value}', Math.round(power))}`
                : ''}
            </button>
          ))}
        </div>

        {webglOk && boundDeviceCount === 0 && !showBindings && !selectedRoom && (
          <button
            type="button"
            onClick={() => openBindings()}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 py-2 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase shadow-lg backdrop-blur transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('house3d.bind.emptyHint')}
          </button>
        )}

        {selectedRoom && (
          <>
            <div className="pointer-events-none absolute inset-0 z-[15] bg-black/25" />
            <div
              ref={panelRef}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:inset-0"
            >
              <RoomPanel
                room={selectedRoom}
                entityIds={roomEntityIds[selectedRoom.id] || []}
                entities={entities}
                callService={callService}
                customArt={customArt}
                onAddDevices={openBindings}
                onClose={() => setSelectedRoomId(null)}
                t={t}
              />
            </div>
          </>
        )}

        {showBindings && (
          <HouseBindingEditor
            rooms={HOUSE_ROOMS}
            doors={HOUSE_DOORS}
            bindings={bindings}
            entities={entities}
            customArt={customArt}
            saveCustomArt={saveCustomArt}
            initialRoomId={bindingRoomId}
            initialTab={bindingTab}
            onChange={changeBindings}
            onClose={closeBindings}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

export default memo(House3DPage);
