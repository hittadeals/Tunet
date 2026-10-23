import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  Lightbulb,
  RotateCcw,
  X,
} from '../../icons';
import RoomPanel from '../house3d/RoomPanel';
import { HouseScene } from '../../utils/houseScene3d';
import {
  collectRoomEntityIds,
  getRoomStats,
  resolveAreaMap,
} from '../../utils/houseScene';
import { getAreas, getEntitiesForArea } from '../../services/haClient';
import { HOUSE_FLOORS, HOUSE_OPENINGS, HOUSE_ROOMS, HOUSE_WINDOWS } from '../../config/houseModel';
import { HOUSE_FURNITURE } from '../../config/houseFurniture';

const FLOOR_OPTIONS = [
  ...HOUSE_FLOORS.map((floor) => ({ id: floor.id, labelKey: floor.labelKey, fallback: floor.label })),
  { id: 'all', labelKey: 'house3d.floor.all', fallback: 'Alla plan' },
];

const MAPPING_AUTO = '__auto__';
const MAPPING_NONE = '__none__';

function supportsWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
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
 * @param {{ entities: Record<string, any>, callService: Function, conn: any, pageSettings: Record<string, any>, pageId: string, savePageSetting: Function, t: Function }} props
 */
function House3DPage({
  entities,
  callService,
  conn,
  pageSettings,
  pageId,
  savePageSetting,
  t,
}) {
  const [areas, setAreas] = useState([]);
  const [areaEntityIds, setAreaEntityIds] = useState({});
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showMapping, setShowMapping] = useState(false);
  const [webglOk] = useState(supportsWebGL);
  const [floor, setFloor] = useState(() => pageSettings?.[pageId]?.houseFloor || 'ground');
  const [showSensors, setShowSensors] = useState(
    () => pageSettings?.[pageId]?.houseSensors !== false
  );

  const canvasRef = useRef(null);
  const labelsRef = useRef(null);
  const panelRef = useRef(null);
  const controllerRef = useRef(null);
  const callbacksRef = useRef(/** @type {any} */ ({}));

  const savedAreaMap = useMemo(
    () => pageSettings?.[pageId]?.houseAreaMap || {},
    [pageSettings, pageId]
  );

  useEffect(() => {
    if (!conn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await getAreas(conn);
        if (!cancelled) setAreas(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAreas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn]);

  useEffect(() => {
    if (!conn || areas.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(
        areas.map(async (area) => {
          try {
            map[area.area_id] = await getEntitiesForArea(conn, area.area_id);
          } catch {
            map[area.area_id] = [];
          }
        })
      );
      if (!cancelled) setAreaEntityIds(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, areas]);

  const areaMap = useMemo(
    () => resolveAreaMap(HOUSE_ROOMS, areas, savedAreaMap),
    [areas, savedAreaMap]
  );

  const areaNames = useMemo(() => {
    const names = {};
    areas.forEach((area) => {
      names[area.area_id] = area.name;
    });
    return names;
  }, [areas]);

  const roomEntityIds = useMemo(
    () =>
      collectRoomEntityIds({
        rooms: HOUSE_ROOMS,
        areaMap,
        areaEntityIds,
        entities,
      }),
    [areaMap, areaEntityIds, entities]
  );

  const roomLights = useMemo(() => {
    const result = {};
    HOUSE_ROOMS.forEach((room) => {
      result[room.id] = (roomEntityIds[room.id] || []).filter((id) => id.startsWith('light.'));
    });
    return result;
  }, [roomEntityIds]);

  const roomStats = useMemo(
    () => getRoomStats(HOUSE_ROOMS, roomEntityIds, entities),
    [roomEntityIds, entities]
  );

  const selectedRoom = HOUSE_ROOMS.find((room) => room.id === selectedRoomId) || null;

  const totalLightsOn = useMemo(
    () => Object.values(roomStats).reduce((sum, stats) => sum + stats.lightsOn, 0),
    [roomStats]
  );

  const toggleLight = useCallback(
    (entityId) => {
      if (!callService || !entityId) return;
      const isOn = entities?.[entityId]?.state === 'on';
      callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
    },
    [callService, entities]
  );

  useEffect(() => {
    callbacksRef.current = {
      onSelectRoom: setSelectedRoomId,
      onToggleLight: toggleLight,
      formatStats: formatStatsLabel,
    };
  }, [toggleLight]);

  useEffect(() => {
    if (!webglOk || !canvasRef.current || !labelsRef.current) return undefined;

    const scene = new HouseScene({
      canvas: canvasRef.current,
      labelHost: labelsRef.current,
      rooms: HOUSE_ROOMS,
      floors: HOUSE_FLOORS,
      openings: HOUSE_OPENINGS,
      windows: HOUSE_WINDOWS,
      furniture: HOUSE_FURNITURE,
      onSelectRoom: (roomId) => callbacksRef.current.onSelectRoom?.(roomId),
      onToggleLight: (entityId) => callbacksRef.current.onToggleLight?.(entityId),
      formatStats: (stats) => callbacksRef.current.formatStats?.(stats) || '',
    });
    controllerRef.current = scene;

    return () => {
      scene.dispose();
      controllerRef.current = null;
    };
  }, [webglOk]);

  useEffect(() => {
    controllerRef.current?.setRoomLights(roomLights);
  }, [roomLights]);

  useEffect(() => {
    controllerRef.current?.setEntities(entities);
  }, [entities]);

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
    controllerRef.current?.setShowSensors(showSensors);
  }, [showSensors]);

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
      setFloor(value);
      savePageSetting?.(pageId, 'houseFloor', value);
    },
    [pageId, savePageSetting]
  );

  const toggleSensors = useCallback(() => {
    setShowSensors((value) => {
      savePageSetting?.(pageId, 'houseSensors', !value);
      return !value;
    });
  }, [pageId, savePageSetting]);

  const changeMapping = useCallback(
    (roomId, value) => {
      const next = { ...savedAreaMap };
      if (value === MAPPING_AUTO) delete next[roomId];
      else if (value === MAPPING_NONE) next[roomId] = '';
      else next[roomId] = value;
      savePageSetting?.(pageId, 'houseAreaMap', next);
    },
    [pageId, savePageSetting, savedAreaMap]
  );

  const mappingValue = useCallback(
    (roomId) => {
      if (!Object.prototype.hasOwnProperty.call(savedAreaMap, roomId)) return MAPPING_AUTO;
      return savedAreaMap[roomId] || MAPPING_NONE;
    },
    [savedAreaMap]
  );

  const mappedCount = useMemo(
    () => HOUSE_ROOMS.filter((room) => areaMap[room.id]).length,
    [areaMap]
  );

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
            {mappedCount}/{HOUSE_ROOMS.length} {t('house3d.roomsMapped')} · {totalLightsOn}{' '}
            {t('roomExplorer.lightsOn')}
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

        <span className="flex-1" />

        <button
          type="button"
          onClick={toggleSensors}
          aria-pressed={showSensors}
          className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
            showSensors
              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
          }`}
        >
          {showSensors ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {t('house3d.sensors')}
        </button>

        <button
          type="button"
          onClick={() => setShowMapping((value) => !value)}
          className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all active:scale-95 ${
            showMapping
              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          {t('house3d.connectRooms')}
        </button>

        {webglOk && (
          <button
            type="button"
            onClick={() => controllerRef.current?.resetView()}
            className="flex items-center gap-1.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('house3d.resetView')}
          </button>
        )}
      </div>

      <div
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
            <div className="grid gap-2 sm:grid-cols-2">
              {HOUSE_ROOMS.filter((room) => floor === 'all' || room.floor === floor).map(
                (room) => {
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
                }
              )}
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase backdrop-blur">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
          {totalLightsOn} {t('roomExplorer.lightsOn')}
        </div>

        {selectedRoom && (
          <>
            <div className="pointer-events-none absolute inset-0 z-[15] bg-black/25" />
            <div
              ref={panelRef}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:inset-0"
            >
              <RoomPanel
                room={selectedRoom}
                areaName={areaNames[areaMap[selectedRoom.id]]}
                entityIds={roomEntityIds[selectedRoom.id] || []}
                entities={entities}
                callService={callService}
                onClose={() => setSelectedRoomId(null)}
                t={t}
              />
            </div>
          </>
        )}

        {showMapping && (
          <div className="absolute inset-0 z-30 flex flex-col bg-[var(--modal-bg)]/95 backdrop-blur-md">
            <div className="flex items-start gap-2 border-b border-[var(--glass-border)] px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {t('house3d.map.title')}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">{t('house3d.map.hint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapping(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {areas.length === 0 && (
              <p className="mx-4 mt-3 rounded-2xl bg-[var(--glass-bg)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                {t('house3d.noAreas')}
              </p>
            )}

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
              {HOUSE_ROOMS.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {room.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t(`house3d.floor.${room.floor === 'upper' ? 'upper' : 'ground'}`)}
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={mappingValue(room.id)}
                      onChange={(event) => changeMapping(room.id, event.target.value)}
                      className="appearance-none rounded-xl border border-[var(--glass-border)] bg-[var(--card-bg)] py-1.5 pr-7 pl-2 text-[11px] text-[var(--text-primary)] outline-none"
                      aria-label={room.label}
                    >
                      <option value={MAPPING_AUTO}>{t('house3d.map.auto')}</option>
                      <option value={MAPPING_NONE}>{t('house3d.map.none')}</option>
                      {areas.map((area) => (
                        <option key={area.area_id} value={area.area_id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(House3DPage);
