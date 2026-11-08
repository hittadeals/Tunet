import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Lightbulb,
  Power,
  Search,
  ArrowUpDown,
  X,
  ChevronDown,
  Check,
  Star,
  Undo2,
  Edit2,
  Settings,
} from '../../icons';
import { getIconComponent } from '../../icons';
import M3Slider from '../ui/M3Slider';
import DeviceArtImage from '../ui/DeviceArtImage';
import DeviceArtPicker from '../ui/DeviceArtPicker';
import IconPicker from '../ui/IconPicker';
import { getAreas } from '../../services/haClient';

const SLIDER_DEBOUNCE_MS = 200;

const SORT_OPTIONS = ['status', 'name-az', 'name-za', 'brightness', 'area', 'unavailable'];

// Quick picks for the lamp icon. The values are icon names from `src/icons`.
const LAMP_ICON_PRESETS = [
  { icon: 'LampCeiling', key: 'ceiling' },
  { icon: 'LampFloor', key: 'floor' },
  { icon: 'LampDesk', key: 'table' },
  { icon: 'LampWallUp', key: 'wall' },
  { icon: 'Lightbulb', key: 'bulb' },
  { icon: 'Sparkles', key: 'strip' },
  { icon: 'Sun', key: 'outdoor' },
  { icon: 'Moon', key: 'night' },
];

const isUnavailableState = (state) => state === 'unavailable' || state === 'unknown';

/**
 * Approximate the colour the lamp is currently emitting so the tile can glow
 * like the real light instead of always looking amber.
 */
function getLightColor(entity) {
  const attributes = entity?.attributes || {};
  const hs = attributes.hs_color;
  if (Array.isArray(hs) && hs.length >= 2 && hs[1] > 8) {
    return `hsl(${Math.round(hs[0])}, ${Math.round(Math.max(45, hs[1]))}%, 60%)`;
  }

  const rgb = attributes.rgb_color;
  if (Array.isArray(rgb) && rgb.length >= 3) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  const kelvin =
    attributes.color_temp_kelvin ||
    (attributes.color_temp ? Math.round(1000000 / attributes.color_temp) : null);
  if (kelvin) {
    if (kelvin < 2700) return '#ff9a3c';
    if (kelvin < 3300) return '#ffb65c';
    if (kelvin < 4500) return '#ffe0b0';
    if (kelvin < 5600) return '#fff3e2';
    return '#dbeafe';
  }

  return 'var(--domain-light)';
}

// ── Individual Light Tile ─────────────────────────────────────────────────────

const LightTile = memo(
  /** @param {{ entity: any, areaName?: string, onToggle: (entityId: string) => void, onBrightness: (entityId: string, value: number) => void, onOpen: (entityId: string) => void, optimisticBrightness?: number, t: (key: string) => string }} props */
  function LightTile({
    entity,
    areaName,
    onToggle,
    onBrightness,
    onOpen,
    optimisticBrightness,
    isFavorite,
    onToggleFavorite,
    artKey,
    iconName,
    t,
  }) {
    const { entity_id, state, attributes } = entity;
    const isOn = state === 'on';
    const isUnavailable = isUnavailableState(state);
    const [optimisticOn, setOptimisticOn] = useState(null);
    useEffect(() => {
      setOptimisticOn(null);
    }, [state]);
    const visualIsOn = optimisticOn ?? isOn;
    const name = attributes?.friendly_name || entity_id.split('.')[1];
    const brightness = attributes?.brightness || 0;
    const brightnessPercent = Math.round(((optimisticBrightness ?? brightness) / 255) * 100);

    const supportedColorModes = attributes?.supported_color_modes;
    const isDimmable = supportedColorModes
      ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
      : (attributes?.supported_features & 1) === 1;

    const Icon = iconName ? getIconComponent(iconName) || Lightbulb : Lightbulb;

    const subEntities = attributes?.entity_id;
    const isGroup = Array.isArray(subEntities) && subEntities.length > 0;

    const glow = visualIsOn ? getLightColor(entity) : 'var(--domain-light)';
    const supportsColor = Boolean(
      supportedColorModes?.some((mode) => ['hs', 'rgb', 'xy', 'color_temp'].includes(mode))
    );

    const handleToggle = (event) => {
      event.stopPropagation();
      if (isUnavailable) return;
      setOptimisticOn(!visualIsOn);
      Promise.resolve()
        .then(() => onToggle(entity_id))
        .catch(() => setOptimisticOn(null));
    };

    return (
      <div
        onClick={(event) => {
          if (event.target.closest('button, input, [role="button"]')) return;
          onOpen(entity_id);
        }}
        data-lights-tile={entity_id}
        className={`glass-texture group relative cursor-pointer overflow-hidden rounded-3xl border p-4 font-sans transition-all duration-500 ${
          isUnavailable ? 'opacity-50' : ''
        }`}
        style={{
          background: visualIsOn
            ? `radial-gradient(120% 100% at 15% 0%, color-mix(in srgb, ${glow} 20%, transparent), transparent 62%), var(--card-bg)`
            : 'var(--card-bg)',
          borderColor: visualIsOn
            ? `color-mix(in srgb, ${glow} 28%, var(--surface-border))`
            : 'var(--glass-border)',
          boxShadow: visualIsOn
            ? `0 22px 45px -32px color-mix(in srgb, ${glow} 70%, transparent), inset 0 1px 0 color-mix(in srgb, ${glow} 12%, transparent)`
            : undefined,
        }}
      >
        {/* Top row: lamp visual + quick controls */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpen(entity_id)}
            disabled={isUnavailable}
            aria-label={`${name} — ${t('lights.openControls') || 'Open controls'}`}
            className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 disabled:cursor-default ${
              visualIsOn ? '' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
            }`}
            style={
              visualIsOn
                ? {
                    backgroundColor: `color-mix(in srgb, ${glow} 16%, transparent)`,
                    color: glow,
                    boxShadow: `0 0 22px -6px color-mix(in srgb, ${glow} 65%, transparent)`,
                  }
                : undefined
            }
          >
            {artKey ? (
              <DeviceArtImage artKey={artKey} className="h-12 w-12 object-contain" />
            ) : (
              <Icon className="h-7 w-7 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
            )}
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleFavorite(entity_id)}
              aria-pressed={isFavorite}
              aria-label={t('light.favorite') || 'Favorite'}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isFavorite
                  ? 'text-[var(--domain-light)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isUnavailable}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                visualIsOn
                  ? 'hover:opacity-80'
                  : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'
              } ${optimisticOn !== null ? 'opacity-80' : ''}`}
              style={
                visualIsOn
                  ? {
                      backgroundColor: `color-mix(in srgb, ${glow} 18%, transparent)`,
                      color: glow,
                    }
                  : undefined
              }
              aria-label={`${name}: ${visualIsOn ? t('common.off') || 'Off' : t('common.on') || 'On'}`}
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Name + status (also opens the full controls) */}
        <button
          type="button"
          onClick={() => onOpen(entity_id)}
          disabled={isUnavailable}
          className="mt-3 block w-full rounded-xl text-left disabled:cursor-default"
        >
          <span className="block truncate text-[15px] leading-tight font-semibold text-[var(--text-primary)]">
            {name}
          </span>
          <span className="card-meta block truncate">
            {isUnavailable
              ? t('status.unavailable') || 'Unavailable'
              : visualIsOn
                ? isDimmable
                  ? `${brightnessPercent}%`
                  : t('common.on') || 'On'
                : t('common.off') || 'Off'}
            {isGroup && subEntities.length > 1 && ` · ${subEntities.length} ${t('lights.groups')}`}
            {areaName && <span className="opacity-60"> · {areaName}</span>}
            {visualIsOn && supportsColor && (
              <span
                aria-hidden="true"
                className="ml-2 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: glow }}
              />
            )}
          </span>
        </button>

        {/* Brightness slider is always reserved for dimmable lights so the grid
            does not jump when a lamp is switched on or off. */}
        {isDimmable && (
          <div className={`mt-3 transition-opacity duration-300 ${visualIsOn ? '' : 'opacity-55'}`}>
            <M3Slider
              variant="level"
              min={0}
              max={255}
              step={1}
              value={optimisticBrightness ?? brightness}
              disabled={isUnavailable}
              onChange={(e) => onBrightness(entity_id, parseInt(e.target.value))}
              colorClass="bg-[var(--domain-light)]"
              ariaLabel={t('light.brightness') || 'Brightness'}
            />
          </div>
        )}
      </div>
    );
  }
);

// ── Confirm Button ────────────────────────────────────────────────────────────

const ConfirmButton = memo(
  /** @param {{ label: string, confirmLabel: string, onConfirm: () => void, t: (key: string) => string }} props */
  function ConfirmButton({ label, confirmLabel, onConfirm, t }) {
    const [pending, setPending] = useState(false);
    const ref = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
      if (!pending) return;
      const handleClick = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setPending(false);
      };
      document.addEventListener('mousedown', handleClick);
      timerRef.current = setTimeout(() => setPending(false), 4000);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        clearTimeout(timerRef.current);
      };
    }, [pending]);

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setPending(true)}
          className={`rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2.5 text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 ${
            pending ? 'opacity-60' : ''
          }`}
        >
          {label}
        </button>

        {pending && (
          <div
            className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }}
          >
            <p className="px-5 pt-4 pb-2 text-xs font-medium text-[var(--text-secondary)]">
              {confirmLabel}
            </p>
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => setPending(false)}
                className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setPending(false);
                  onConfirm();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-color)] px-3 py-2 text-[11px] font-bold tracking-wider text-white uppercase transition-all hover:opacity-90 active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
                {t('common.confirm') || 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// ── Sort Dropdown ─────────────────────────────────────────────────────────────

const SortDropdown = memo(
  /** @param {{ sortMode: string, onSortChange: (mode: string) => void, t: (key: string) => string }} props */
  function SortDropdown({ sortMode, onSortChange, t }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      if (!open) return;
      const handleClick = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="group popup-surface popup-surface-hover flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all active:scale-95"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-color)]" />
          <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase italic">
            {t(`lights.sort.${sortMode}`) || sortMode}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-500 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            className="absolute right-0 z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }}
          >
            {SORT_OPTIONS.map((key) => {
              const active = key === sortMode;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSortChange(key);
                    setOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-xs font-bold tracking-widest uppercase transition-all ${
                    active
                      ? 'text-[var(--accent-color)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{ backgroundColor: active ? 'var(--accent-bg)' : 'transparent' }}
                >
                  {t(`lights.sort.${key}`) || key}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

// ── Main Lights Page ──────────────────────────────────────────────────────────

function LightsPage({
  entities,
  callService,
  conn,
  pageSettings,
  pageId,
  savePageSetting,
  customArt = {},
  customIcons = {},
  saveCustomArt,
  saveCustomIcon,
  setShowLightModal,
  t,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState(
    () => pageSettings?.[pageId]?.lightsSort || 'area'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsQuery, setSettingsQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => {
    const saved = pageSettings?.[pageId]?.lightsSelection;
    return Array.isArray(saved) ? saved : null;
  });
  const [favorites, setFavorites] = useState(
    () => pageSettings?.[pageId]?.lightsFavorites || []
  );
  const [areas, setAreas] = useState([]);
  const [optimistic, setOptimistic] = useState({});
  const [undoAllOff, setUndoAllOff] = useState(null);
  const debounceRefs = useRef({});
  const undoTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleSearchShortcut = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  // Fetch areas for grouping
  useEffect(() => {
    if (!conn) return;
    let cancelled = false;
    getAreas(conn)
      .then((result) => {
        if (!cancelled) setAreas(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conn]);

  // Build area lookup from enriched entity attributes
  const areaMap = useMemo(() => {
    const map = new Map();
    areas.forEach((a) => map.set(a.area_id, a.name || a.area_id));
    return map;
  }, [areas]);

  const handleSortChange = useCallback(
    (mode) => {
      setSortMode(mode);
      if (savePageSetting && pageId) savePageSetting(pageId, 'lightsSort', mode);
    },
    [savePageSetting, pageId]
  );

  // Get area name for a light entity using enriched attributes
  const getAreaName = useCallback(
    (entity) => {
      const a = entity.attributes || {};
      if (a.area_id && areaMap.has(a.area_id)) return areaMap.get(a.area_id);
      if (a.area_name) return a.area_name;
      return null;
    },
    [areaMap]
  );

  // All light entities
  const allLights = useMemo(
    () => Object.values(entities).filter((e) => e.entity_id.startsWith('light.') && e.state !== undefined),
    [entities]
  );
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const availableLights = selectedSet
    ? allLights.filter((entity) => selectedSet.has(entity.entity_id))
    : allLights;

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  // Filter by search only; the status/favorites filters were removed to keep
  // the page calm. Favorites are still pinned to the top via the sorter.
  const filteredLights = useMemo(() => {
    const base = availableLights;
    if (!searchTerm.trim()) return base;
    const term = searchTerm.toLowerCase();
    return base.filter((e) => {
      const name = (e.attributes?.friendly_name || e.entity_id).toLowerCase();
      const area = (getAreaName(e) || '').toLowerCase();
      return name.includes(term) || area.includes(term) || e.entity_id.toLowerCase().includes(term);
    });
  }, [availableLights, searchTerm, getAreaName]);

  // Sort lights
  const sortedLights = useMemo(() => {
    const list = [...filteredLights];
    const sorters = {
      status: (a, b) => {
        const aOn = a.state === 'on' ? 0 : 1;
        const bOn = b.state === 'on' ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        const aBr = a.attributes?.brightness || 0;
        const bBr = b.attributes?.brightness || 0;
        if (aBr !== bBr) return bBr - aBr;
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      'name-az': (a, b) => {
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      'name-za': (a, b) => {
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return bName.localeCompare(aName);
      },
      brightness: (a, b) => {
        const aBr = a.state === 'on' ? a.attributes?.brightness || 0 : -1;
        const bBr = b.state === 'on' ? b.attributes?.brightness || 0 : -1;
        if (aBr !== bBr) return bBr - aBr;
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      area: (a, b) => {
        const aArea = getAreaName(a) || '\uffff';
        const bArea = getAreaName(b) || '\uffff';
        if (aArea !== bArea) return aArea.localeCompare(bArea);
        const aOn = a.state === 'on' ? 0 : 1;
        const bOn = b.state === 'on' ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
      unavailable: (a, b) => {
        const aUn = isUnavailableState(a.state) ? 0 : 1;
        const bUn = isUnavailableState(b.state) ? 0 : 1;
        if (aUn !== bUn) return aUn - bUn;
        const aName = a.attributes?.friendly_name || a.entity_id;
        const bName = b.attributes?.friendly_name || b.entity_id;
        return aName.localeCompare(bName);
      },
    };
    list.sort(sorters[sortMode] || sorters.status);
    list.sort((a, b) => Number(favoriteSet.has(b.entity_id)) - Number(favoriteSet.has(a.entity_id)));
    return list;
  }, [filteredLights, sortMode, getAreaName, favoriteSet]);

  // Group by area
  const areaGroups = useMemo(() => {
    if (sortMode !== 'area') return null;
    const result = new Map();
    sortedLights.forEach((e) => {
      const area = getAreaName(e) || t('lights.noArea') || 'Other';
      if (!result.has(area)) result.set(area, []);
      result.get(area).push(e);
    });
    return result;
  }, [sortMode, sortedLights, getAreaName, t]);

  const onCount = filteredLights.filter((e) => e.state === 'on').length;
  const totalCount = filteredLights.length;

  const handleToggle = useCallback(
    (entityId) => callService('light', 'toggle', { entity_id: entityId }),
    [callService]
  );

  const handleOpen = useCallback(
    (entityId) => {
      if (setShowLightModal) setShowLightModal(entityId);
    },
    [setShowLightModal]
  );

  const handleToggleFavorite = useCallback(
    (entityId) => {
      setFavorites((prev) => {
        const next = prev.includes(entityId)
          ? prev.filter((id) => id !== entityId)
          : [...prev, entityId];
        if (savePageSetting && pageId) savePageSetting(pageId, 'lightsFavorites', next);
        return next;
      });
    },
    [savePageSetting, pageId]
  );

  const handleBrightness = useCallback(
    (entityId, val) => {
      setOptimistic((prev) => ({ ...prev, [entityId]: val }));
      clearTimeout(debounceRefs.current[entityId]);
      debounceRefs.current[entityId] = setTimeout(() => {
        callService('light', 'turn_on', { entity_id: entityId, brightness: val });
      }, SLIDER_DEBOUNCE_MS);
    },
    [callService]
  );

  const handleAllOff = useCallback(() => {
    const targets = filteredLights.filter((e) => e.state === 'on');
    if (targets.length === 0) return;
    setUndoAllOff({
      lights: targets.map((e) => ({
        entity_id: e.entity_id,
        brightness: e.attributes?.brightness,
      })),
    });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoAllOff(null), 6000);
    targets.forEach((e) => callService('light', 'turn_off', { entity_id: e.entity_id }));
  }, [filteredLights, callService]);

  const handleUndoAllOff = useCallback(() => {
    if (!undoAllOff) return;
    undoAllOff.lights.forEach(({ entity_id, brightness }) => {
      callService('light', 'turn_on', {
        entity_id,
        ...(Number.isFinite(brightness) ? { brightness } : {}),
      });
    });
    setUndoAllOff(null);
    clearTimeout(undoTimerRef.current);
  }, [undoAllOff, callService]);

  const handleAllOn = useCallback(() => {
    filteredLights
      .filter((e) => e.state !== 'on' && !isUnavailableState(e.state))
      .forEach((e) => callService('light', 'turn_on', { entity_id: e.entity_id }));
  }, [filteredLights, callService]);

  const handleAreaOff = useCallback(
    (lights) => {
      lights
        .filter((e) => e.state === 'on')
        .forEach((e) => callService('light', 'turn_off', { entity_id: e.entity_id }));
    },
    [callService]
  );

  const saveSelection = (next) => {
    setSelectedIds(next);
    if (savePageSetting && pageId) savePageSetting(pageId, 'lightsSelection', next);
  };

  const toggleDevice = (entityId) => {
    const base = selectedSet ? [...selectedSet] : allLights.map((entity) => entity.entity_id);
    const next = base.includes(entityId)
      ? base.filter((item) => item !== entityId)
      : [...base, entityId];
    const normalized =
      next.length === allLights.length
        ? null
        : allLights.map((entity) => entity.entity_id).filter((item) => next.includes(item));
    saveSelection(normalized);
  };

  const selectAllDevices = () => saveSelection(null);

  const getArtKey = (entity) => {
    const override = customArt?.[entity.entity_id];
    if (override === 'none') return null;
    return override || null;
  };

  const getIconName = (entity) =>
    customIcons?.[entity.entity_id] || entity.attributes?.icon || null;

  const updateIcon = (entityId, iconName) => {
    saveCustomIcon?.(entityId, iconName || '');
  };

  const updateArt = (entityId, artKey) => {
    saveCustomArt?.(entityId, artKey);
  };

  const settingsLights = useMemo(() => {
    const query = settingsQuery.trim().toLowerCase();
    if (!query) return allLights;
    return allLights.filter((entity) => {
      const name = (entity.attributes?.friendly_name || entity.entity_id).toLowerCase();
      const area = (getAreaName(entity) || '').toLowerCase();
      return name.includes(query) || area.includes(query);
    });
  }, [allLights, settingsQuery, getAreaName]);

  const renderTile = (entity) => (
    <LightTile
      key={entity.entity_id}
      entity={entity}
      areaName={getAreaName(entity)}
      onToggle={handleToggle}
      onBrightness={handleBrightness}
      onOpen={handleOpen}
      optimisticBrightness={optimistic[entity.entity_id]}
      isFavorite={favorites.includes(entity.entity_id)}
      onToggleFavorite={handleToggleFavorite}
      artKey={getArtKey(entity)}
      iconName={getIconName(entity)}
      t={t}
    />
  );

  const renderGrid = (lights) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {lights.map(renderTile)}
    </div>
  );

  const hasActiveFilter = Boolean(searchTerm.trim());

  return (
    <div className="animate-in fade-in zoom-in px-4 pb-8 duration-500">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="page-title truncate">
            {t('lights.pageTitle') || t('addCard.type.light') || 'Lights'}
          </h2>
          <p className="page-subtitle">
            {onCount} {(t('common.on') || 'On').toLowerCase()} · {totalCount}{' '}
            {t('lights.total') || 'total'}
            {favorites.length > 0 && (
              <span className="opacity-70">
                {' '}
                · {favorites.length} {(t('lights.filter.favorites') || 'favorites').toLowerCase()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-2xl border px-3 text-[11px] font-bold tracking-widest uppercase transition-colors ${
              settingsOpen
                ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            {t('lights.customize') || 'Customize lamps'}
          </button>
          {totalCount > 0 && (
            <>
              <ConfirmButton
                label={t('lights.allOn') || 'All on'}
                confirmLabel={t('lights.confirmAllOn') || 'Turn on all lights?'}
                onConfirm={handleAllOn}
                t={t}
              />
              <ConfirmButton
                label={t('lights.allOff') || 'All off'}
                confirmLabel={t('lights.confirmAllOff') || 'Turn off all lights?'}
                onConfirm={handleAllOff}
                t={t}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Customize panel: visibility + icon + illustration ─────────────── */}
      {settingsOpen && (
        <div className="glass-texture mb-5 rounded-3xl border border-[var(--surface-border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="card-eyebrow">{t('lights.customize') || 'Customize lamps'}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllDevices}
                className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:text-[var(--text-primary)]"
              >
                {t('appliances.showAll')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label={t('common.close') || 'Close'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={settingsQuery}
              onChange={(e) => setSettingsQuery(e.target.value)}
              placeholder={t('lights.search') || 'Search lights...'}
              className="popup-surface w-full rounded-2xl py-2.5 pr-9 pl-10 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
            />
            {settingsQuery && (
              <button
                type="button"
                onClick={() => setSettingsQuery('')}
                aria-label={t('common.close') || 'Clear'}
                className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {settingsLights.map((entity) => {
              const checked = !selectedSet || selectedSet.has(entity.entity_id);
              const expanded = expandedId === entity.entity_id;
              const iconName = getIconName(entity);
              const Icon = iconName ? getIconComponent(iconName) || Lightbulb : Lightbulb;
              const artKey = getArtKey(entity);
              return (
                <div
                  key={entity.entity_id}
                  className={`rounded-2xl border p-2 transition-colors ${
                    checked
                      ? 'border-[var(--surface-border)] bg-[var(--glass-bg)]'
                      : 'border-[var(--surface-border)] bg-transparent opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() => toggleDevice(entity.entity_id)}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-[var(--bg-primary)]'
                            : 'border-[var(--surface-border)]'
                        }`}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                        {artKey ? (
                          <DeviceArtImage artKey={artKey} className="h-10 w-10 object-contain" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                          {entity.attributes?.friendly_name || entity.entity_id}
                        </span>
                        {getAreaName(entity) && (
                          <span className="block truncate text-[10px] text-[var(--text-muted)]">
                            {getAreaName(entity)}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : entity.entity_id)}
                      aria-expanded={expanded}
                      aria-label={t('lights.appearance') || 'Appearance'}
                      title={t('lights.appearance') || 'Appearance'}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        expanded
                          ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-3 space-y-3 border-t border-[var(--surface-border)] pt-3">
                      <div>
                        <p className="card-eyebrow mb-2">{t('lights.icon') || 'Icon'}</p>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {LAMP_ICON_PRESETS.map(({ icon, key }) => {
                            const PresetIcon = getIconComponent(icon);
                            const active = iconName === icon;
                            return (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => updateIcon(entity.entity_id, active ? '' : icon)}
                                aria-pressed={active}
                                title={t(`lights.preset.${key}`) || key}
                                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                                  active
                                    ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                                    : 'border-[var(--surface-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {PresetIcon ? (
                                  <PresetIcon className="h-4 w-4" />
                                ) : (
                                  <Lightbulb className="h-4 w-4" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <IconPicker
                          value={iconName || ''}
                          onSelect={(name) => updateIcon(entity.entity_id, name)}
                          onClear={() => updateIcon(entity.entity_id, '')}
                          t={t}
                          maxHeightClass="max-h-56"
                        />
                      </div>
                      <div>
                        <p className="card-eyebrow mb-2">{t('lights.image') || 'Illustration'}</p>
                        <DeviceArtPicker
                          entityId={entity.entity_id}
                          entity={entity}
                          value={customArt?.[entity.entity_id]}
                          onChange={(key) => updateArt(entity.entity_id, key)}
                          t={t}
                          maxHeightClass="max-h-48"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Toolbar: search + sort ────────────────────────────────────────── */}
      {availableLights.length > 0 && (
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('lights.search') || 'Search lights...'}
                className="popup-surface w-full rounded-2xl py-2.5 pr-9 pl-10 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  aria-label={t('common.close') || 'Clear'}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <SortDropdown sortMode={sortMode} onSortChange={handleSortChange} t={t} />
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {totalCount > 0 ? (
        areaGroups ? (
          <div className="space-y-6">
            {[...areaGroups.entries()].map(([areaName, lights]) => (
              <div key={areaName}>
                <div className="sticky top-0 z-20 -mx-2 mb-3 flex items-center gap-3 rounded-2xl bg-[var(--bg-primary)]/90 px-2 py-2 backdrop-blur">
                  <h3 className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    {areaName}
                  </h3>
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {lights.filter((e) => e.state === 'on').length}/{lights.length}
                  </span>
                  {lights.some((e) => e.state === 'on') && (
                    <button
                      type="button"
                      onClick={() => handleAreaOff(lights)}
                      aria-label={`${areaName}: ${t('lights.allOff') || 'All off'}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {renderGrid(lights)}
              </div>
            ))}
          </div>
        ) : (
          renderGrid(sortedLights)
        )
      ) : availableLights.length === 0 && allLights.length > 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Lightbulb className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-lg text-[var(--text-secondary)]">
            {t('appliances.noSelection')}
          </p>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase"
          >
            {t('lights.customize') || 'Customize lamps'}
          </button>
        </div>
      ) : hasActiveFilter ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Search className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-lg text-[var(--text-secondary)]">
            {t('lights.noResults') || 'No lights match your filters'}
          </p>
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-6 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 shadow-lg shadow-black/5">
            <Lightbulb className="h-12 w-12 text-[var(--text-primary)] opacity-60" />
          </div>
          <p className="text-lg text-[var(--text-secondary)]">
            {t('lights.noLights') || 'No lights found'}
          </p>
        </div>
      )}

      {undoAllOff && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--surface-border)] bg-[var(--modal-bg)] px-3 py-2 shadow-lg">
          <button
            type="button"
            onClick={handleUndoAllOff}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--accent-bg)] px-3 text-[11px] font-bold text-[var(--accent-color)]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t('common.undo') || 'Undo'}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(LightsPage);
