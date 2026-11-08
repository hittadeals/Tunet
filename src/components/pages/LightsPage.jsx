import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Lightbulb,
  Power,
  Play,
  Search,
  Sparkles,
  ToggleRight,
  ArrowUpDown,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  GripVertical,
  LayoutGrid,
  ListChecks,
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

const SORT_OPTIONS = ['status', 'name-az', 'name-za', 'brightness', 'area', 'manual', 'unavailable'];

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

/** Service domain for a tile: lights, virtual switches and scenes. */
const getControlDomain = (entityId) => {
  const domain = String(entityId || '').split('.')[0];
  return domain === 'scene' || domain === 'input_boolean' ? domain : 'light';
};

/**
 * Colour a single entity reports. Groups usually leave hs_color/rgb_color empty,
 * so `getLightColor` falls back to the members.
 */
function getOwnLightColor(entity) {
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

  return null;
}

/** Light entities that belong to a light group (attributes.entity_id). */
function getMemberLights(entity, entities) {
  const ids = entity?.attributes?.entity_id;
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => entities?.[id]).filter(Boolean);
}

/**
 * Approximate the colour the lamp is currently emitting. For groups, use the
 * first active member so a group tile looks like one of its lamps instead of
 * falling back to plain amber.
 */
function getLightColor(entity, entities) {
  const own = getOwnLightColor(entity);
  if (own) return own;
  const members = getMemberLights(entity, entities);
  const active = members.find((member) => member.state === 'on' && getOwnLightColor(member));
  if (active) return getOwnLightColor(active);
  const memberWithColor = members.find((member) => getOwnLightColor(member));
  return memberWithColor ? getOwnLightColor(memberWithColor) : 'var(--domain-light)';
}

/** Average brightness of a light group when the group entity has none. */
function getLightBrightness(entity, entities) {
  const own = entity?.attributes?.brightness;
  if (Number.isFinite(own)) return own;
  const members = getMemberLights(entity, entities).filter(
    (member) => member.state === 'on' && Number.isFinite(member.attributes?.brightness)
  );
  if (members.length === 0) return 0;
  return Math.round(
    members.reduce((sum, member) => sum + member.attributes.brightness, 0) / members.length
  );
}

const COLOR_MODES = ['hs', 'rgb', 'xy', 'color_temp'];

function supportsColorEntity(entity, entities) {
  const ownModes = entity?.attributes?.supported_color_modes;
  if (ownModes?.some((mode) => COLOR_MODES.includes(mode))) return true;
  return getMemberLights(entity, entities).some((member) =>
    member.attributes?.supported_color_modes?.some((mode) => COLOR_MODES.includes(mode))
  );
}

function isDimmableEntity(entity, entities) {
  const domain = String(entity?.entity_id || '').split('.')[0];
  if (domain !== 'light') return false;
  const ownModes = entity?.attributes?.supported_color_modes;
  if (ownModes) return !ownModes.includes('onoff') || ownModes.length > 1;
  if ((entity?.attributes?.supported_features & 1) === 1) return true;
  return getMemberLights(entity, entities).some((member) => {
    const modes = member.attributes?.supported_color_modes;
    return modes ? !modes.includes('onoff') || modes.length > 1 : (member.attributes?.supported_features & 1) === 1;
  });
}

// ── Individual Light Tile ─────────────────────────────────────────────────────

const LightTile = memo(
  /** @param {{ entity: any, areaName?: string, onToggle: (entityId: string) => void, onBrightness: (entityId: string, value: number) => void, onOpen: (entityId: string) => void, optimisticBrightness?: number, t: (key: string) => string }} props */
  function LightTile({
    entity,
    entities,
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
    index = 0,
    selectMode = false,
    selected = false,
    onSelect,
    manualMode = false,
    dragging = false,
    onDragStart,
    onDragOver,
    onDrop,
  }) {
    const { entity_id, state, attributes } = entity;
    const domain = entity_id.split('.')[0];
    const isLight = domain === 'light';
    const isSwitch = domain === 'input_boolean';
    const isScene = domain === 'scene';
    const isOn = state === 'on' || (isScene && state === 'scening');
    const isUnavailable = state === 'unavailable' || (state === 'unknown' && !isScene);
    const [optimisticOn, setOptimisticOn] = useState(null);
    const [scenePulse, setScenePulse] = useState(false);
    useEffect(() => {
      setOptimisticOn(null);
    }, [state]);
    useEffect(() => {
      if (!scenePulse) return undefined;
      const timer = setTimeout(() => setScenePulse(false), 1200);
      return () => clearTimeout(timer);
    }, [scenePulse]);
    const visualIsOn = isScene ? scenePulse || isOn : (optimisticOn ?? isOn);
    const name = attributes?.friendly_name || entity_id.split('.')[1];
    const brightness = getLightBrightness(entity, entities);
    const brightnessPercent = Math.round(((optimisticBrightness ?? brightness) / 255) * 100);
    const isDimmable = isDimmableEntity(entity, entities);

    const DefaultIcon = isScene ? Sparkles : isSwitch ? ToggleRight : Lightbulb;
    const Icon = iconName ? getIconComponent(iconName) || DefaultIcon : DefaultIcon;

    const subEntities = attributes?.entity_id;
    const isGroup = isLight && Array.isArray(subEntities) && subEntities.length > 0;

    const glow = visualIsOn ? getLightColor(entity, entities) : 'var(--domain-light)';
    const supportsColor = isLight && supportsColorEntity(entity, entities);

    const accent = isScene ? '#a78bfa' : isSwitch ? '#34d399' : glow;
    const brightnessFactor = visualIsOn
      ? isScene
        ? 1
        : isDimmable
          ? Math.max(0.25, brightnessPercent / 100)
          : 1
      : 0;
    const glowStrength = 10 + Math.round(brightnessFactor * 24);
    const isAccentActive = visualIsOn || isScene;

    const handleToggle = (event) => {
      event?.stopPropagation();
      if (isUnavailable) return;
      if (isScene) {
        setScenePulse(true);
        onToggle(entity_id);
        return;
      }
      setOptimisticOn(!visualIsOn);
      Promise.resolve()
        .then(() => onToggle(entity_id))
        .catch(() => setOptimisticOn(null));
    };

    const handleActivate = (event) => {
      event?.stopPropagation();
      if (selectMode) {
        onSelect?.(entity_id);
        return;
      }
      if (isLight) {
        onOpen(entity_id);
        return;
      }
      handleToggle(event);
    };

    return (
      <div
        onClick={(event) => {
          if (event.target.closest('button, input, [role="button"]')) return;
          handleActivate(event);
        }}
        data-lights-tile={entity_id}
        data-selected={selected ? 'true' : undefined}
        draggable={manualMode && !isUnavailable}
        onDragStart={() => onDragStart?.(entity_id)}
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          onDrop?.(entity_id);
        }}
        onDragEnd={() => onDragStart?.(null)}
        className={`glass-texture group relative flex h-full min-h-[10.75rem] cursor-pointer flex-col overflow-hidden rounded-3xl border p-2 font-sans transition-all duration-300 animate-in fade-in hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:transform-none motion-reduce:transition-none ${
          isUnavailable ? 'opacity-50' : ''
        } ${dragging ? 'opacity-40' : ''} ${
          selected ? 'ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--bg-primary)]' : ''
        } ${manualMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{
          animationDelay: `${Math.min(index, 20) * 25}ms`,
          background: isAccentActive
            ? `radial-gradient(120% 100% at 50% 0%, color-mix(in srgb, ${accent} ${glowStrength}%, transparent), transparent 64%), var(--card-bg)`
            : 'var(--card-bg)',
          borderColor: isAccentActive
            ? `color-mix(in srgb, ${accent} ${isScene ? 24 : 28}%, var(--surface-border))`
            : 'var(--glass-border)',
          boxShadow: isAccentActive
            ? `0 22px 45px -32px color-mix(in srgb, ${accent} 70%, transparent), inset 0 1px 0 color-mix(in srgb, ${accent} 12%, transparent)`
            : undefined,
        }}
      >
        {/* Area / drag handle in the top-left corner. */}
        {manualMode ? (
          <span
            className="absolute top-2 left-2 z-20 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--glass-bg)] text-[var(--text-muted)]"
            title={t('lights.dragHandle') || 'Drag to reorder'}
          >
            <GripVertical className="h-3 w-3" />
          </span>
        ) : (
          areaName && (
            <span className="absolute top-2 left-2 z-20 max-w-[46%] truncate rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[8px] font-bold tracking-[0.14em] text-[var(--text-muted)] uppercase backdrop-blur">
              {areaName}
            </span>
          )
        )}

        {/* Quick controls sit in the corner so the illustration can own the card. */}
        <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5">
          {selectMode ? (
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                selected
                  ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-[var(--bg-primary)]'
                  : 'border-[var(--surface-border)] bg-[var(--glass-bg)] text-transparent'
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onToggleFavorite(entity_id)}
                aria-pressed={isFavorite}
                aria-label={t('light.favorite') || 'Favorite'}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] ${
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
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] ${
                  visualIsOn
                    ? 'hover:opacity-80'
                    : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'
                } ${optimisticOn !== null ? 'opacity-80' : ''}`}
                style={
                  visualIsOn
                    ? {
                        backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
                        color: accent,
                      }
                    : undefined
                }
                aria-label={
                  isScene
                    ? `${name}: ${t('lights.activate') || 'Activate'}`
                    : `${name}: ${visualIsOn ? t('common.off') || 'Off' : t('common.on') || 'On'}`
                }
              >
                {isScene ? <Play className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        {/* Centered illustration: fill the free height of the tile. */}
        <button
          type="button"
          onClick={handleActivate}
          disabled={isUnavailable}
          aria-label={
            isLight
              ? `${name} — ${t('lights.openControls') || 'Open controls'}`
              : `${name} — ${
                  isScene
                    ? t('lights.activate') || 'Activate'
                    : visualIsOn
                      ? t('common.off') || 'Off'
                      : t('common.on') || 'On'
                }`
          }
          className="relative flex min-h-0 flex-1 items-center justify-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] disabled:cursor-default"
        >
          {/* Soft pedestal glow under the illustration. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1/2 h-6 w-28 -translate-x-1/2 rounded-[50%] blur-lg transition-opacity duration-500"
            style={{
              background: `radial-gradient(ellipse, ${accent}, transparent 70%)`,
              opacity: isAccentActive ? 0.18 + brightnessFactor * 0.4 : 0,
            }}
          />
          {/* Subtle contrast plate so dark art reads in both themes. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_55%,color-mix(in_srgb,var(--text-primary)_5%,transparent),transparent_72%)]"
          />
          {artKey ? (
            <DeviceArtImage
              artKey={artKey}
              className="relative h-full max-h-[6.5rem] w-auto max-w-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
            />
          ) : (
            <Icon className="relative h-14 w-14 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none" />
          )}
        </button>

        {/* Name + status centered under the illustration */}
        <button
          type="button"
          onClick={handleActivate}
          disabled={isUnavailable}
          className="w-full rounded-xl px-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] disabled:cursor-default"
        >
          <span className="block truncate text-[15px] leading-tight font-semibold text-[var(--text-primary)]">
            {name}
          </span>
          <span className="mt-0.5 block truncate text-[9px] leading-tight font-bold tracking-[0.16em] text-[var(--text-muted)] uppercase">
            {isScene
              ? t('lights.scene') || 'Scene'
              : isUnavailable
                ? t('status.unavailable') || 'Unavailable'
                : visualIsOn
                  ? isDimmable
                    ? `${brightnessPercent}%`
                    : t('common.on') || 'On'
                  : t('common.off') || 'Off'}
            {isGroup && subEntities.length > 1 && ` · ${subEntities.length} ${t('lights.groups')}`}
            {visualIsOn && supportsColor && (
              <span
                aria-hidden="true"
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ backgroundColor: glow }}
              />
            )}
          </span>
        </button>

        {/* Brightness slider is always reserved for dimmable lights so the grid
            does not jump when a lamp is switched on or off. */}
        {isDimmable && (
          <div
            className={`shrink-0 transition-opacity duration-300 ${visualIsOn ? '' : 'opacity-55'}`}
          >
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

// ── Compact list tile ─────────────────────────────────────────────────────────

const CompactLightTile = memo(function CompactLightTile({
  entity,
  entities,
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
  selectMode = false,
  selected = false,
  onSelect,
  manualMode = false,
  dragging = false,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  const { entity_id, state, attributes } = entity;
  const domain = entity_id.split('.')[0];
  const isLight = domain === 'light';
  const isSwitch = domain === 'input_boolean';
  const isScene = domain === 'scene';
  const isOn = state === 'on' || (isScene && state === 'scening');
  const isUnavailable = state === 'unavailable' || (state === 'unknown' && !isScene);
  const [optimisticOn, setOptimisticOn] = useState(null);
  const [scenePulse, setScenePulse] = useState(false);
  useEffect(() => {
    setOptimisticOn(null);
  }, [state]);
  useEffect(() => {
    if (!scenePulse) return undefined;
    const timer = setTimeout(() => setScenePulse(false), 1200);
    return () => clearTimeout(timer);
  }, [scenePulse]);
  const visualIsOn = isScene ? scenePulse || isOn : (optimisticOn ?? isOn);
  const name = attributes?.friendly_name || entity_id.split('.')[1];
  const brightness = getLightBrightness(entity, entities);
  const brightnessPercent = Math.round(((optimisticBrightness ?? brightness) / 255) * 100);
  const isDimmable = isDimmableEntity(entity, entities);
  const DefaultIcon = isScene ? Sparkles : isSwitch ? ToggleRight : Lightbulb;
  const Icon = iconName ? getIconComponent(iconName) || DefaultIcon : DefaultIcon;
  const glow = visualIsOn ? getLightColor(entity, entities) : 'var(--domain-light)';
  const accent = isScene ? '#a78bfa' : isSwitch ? '#34d399' : glow;
  const isAccentActive = visualIsOn || isScene;

  const handleToggle = (event) => {
    event?.stopPropagation();
    if (isUnavailable) return;
    if (isScene) {
      setScenePulse(true);
      onToggle(entity_id);
      return;
    }
    setOptimisticOn(!visualIsOn);
    Promise.resolve()
      .then(() => onToggle(entity_id))
      .catch(() => setOptimisticOn(null));
  };

  const handleActivate = (event) => {
    event?.stopPropagation();
    if (selectMode) {
      onSelect?.(entity_id);
      return;
    }
    if (isLight) {
      onOpen(entity_id);
      return;
    }
    handleToggle(event);
  };

  return (
    <div
      data-lights-tile={entity_id}
      data-selected={selected ? 'true' : undefined}
      draggable={manualMode && !isUnavailable}
      onDragStart={() => onDragStart?.(entity_id)}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(entity_id);
      }}
      onDragEnd={() => onDragStart?.(null)}
      onClick={(event) => {
        if (event.target.closest('button, input, [role="button"]')) return;
        handleActivate(event);
      }}
      className={`glass-texture group relative flex cursor-pointer items-center gap-2 rounded-2xl border p-2 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${
        isUnavailable ? 'opacity-50' : ''
      } ${dragging ? 'opacity-40' : ''} ${
        selected ? 'ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--bg-primary)]' : ''
      } ${manualMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        borderColor: isAccentActive
          ? `color-mix(in srgb, ${accent} 26%, var(--surface-border))`
          : 'var(--glass-border)',
        background: isAccentActive
          ? `color-mix(in srgb, ${accent} 6%, var(--card-bg))`
          : 'var(--card-bg)',
      }}
    >
      {manualMode && (
        <span className="text-[var(--text-muted)]" title={t('lights.dragHandle') || 'Drag to reorder'}>
          <GripVertical className="h-4 w-4" />
        </span>
      )}
      <button
        type="button"
        onClick={handleActivate}
        disabled={isUnavailable}
        aria-label={`${name} — ${
          isLight
            ? t('lights.openControls') || 'Open controls'
            : isScene
              ? t('lights.activate') || 'Activate'
              : visualIsOn
                ? t('common.off') || 'Off'
                : t('common.on') || 'On'
        }`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] disabled:cursor-default"
        style={
          isAccentActive
            ? {
                backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                color: accent,
              }
            : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-muted)' }
        }
      >
        {artKey ? (
          <DeviceArtImage artKey={artKey} className="h-9 w-9 object-contain" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </button>
      <button
        type="button"
        onClick={handleActivate}
        disabled={isUnavailable}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)] disabled:cursor-default"
      >
        <span className="block truncate text-sm leading-tight font-semibold text-[var(--text-primary)]">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-[9px] leading-tight font-bold tracking-[0.16em] text-[var(--text-muted)] uppercase">
          {isScene
            ? t('lights.scene') || 'Scene'
            : isUnavailable
              ? t('status.unavailable') || 'Unavailable'
              : visualIsOn
                ? isDimmable
                  ? `${brightnessPercent}%`
                  : t('common.on') || 'On'
                : t('common.off') || 'Off'}
          {areaName && <span className="opacity-60"> · {areaName}</span>}
        </span>
      </button>
      {isDimmable && (
        <div className={`hidden w-24 shrink-0 sm:block ${visualIsOn ? '' : 'opacity-55'}`}>
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
      {selectMode ? (
        <span
          aria-hidden="true"
          className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
            selected
              ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-[var(--bg-primary)]'
              : 'border-[var(--surface-border)] text-transparent'
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onToggleFavorite(entity_id)}
            aria-pressed={isFavorite}
            aria-label={t('light.favorite') || 'Favorite'}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              isFavorite ? 'text-[var(--domain-light)]' : 'text-[var(--text-muted)]'
            }`}
          >
            <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isUnavailable}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              visualIsOn
                ? 'hover:opacity-80'
                : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
            }`}
            style={visualIsOn ? { backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent } : undefined}
            aria-label={
              isScene
                ? `${name}: ${t('lights.activate') || 'Activate'}`
                : `${name}: ${visualIsOn ? t('common.off') || 'Off' : t('common.on') || 'On'}`
            }
          >
            {isScene ? <Play className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
});

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
  const [viewMode, setViewMode] = useState(
    () => pageSettings?.[pageId]?.lightsView || 'gallery'
  );
  const [selectMode, setSelectMode] = useState(false);
  const [multiSelected, setMultiSelected] = useState(() => new Set());
  const [collapsedAreas, setCollapsedAreas] = useState(() => new Set());
  const [manualOrder, setManualOrder] = useState(
    () => pageSettings?.[pageId]?.lightsOrder || []
  );
  const [draggingId, setDraggingId] = useState(null);
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

  useEffect(() => {
    if (!settingsOpen && !selectMode) return undefined;
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      setSettingsOpen(false);
      setSelectMode(false);
      setMultiSelected(new Set());
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settingsOpen, selectMode]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [settingsOpen]);

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

  const handleViewChange = useCallback(
    (mode) => {
      setViewMode(mode);
      if (savePageSetting && pageId) savePageSetting(pageId, 'lightsView', mode);
    },
    [savePageSetting, pageId]
  );

  const handleToggleSelectMode = useCallback(() => {
    setSelectMode((value) => {
      if (value) setMultiSelected(new Set());
      return !value;
    });
  }, []);

  const handleTileSelect = useCallback((entityId) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }, []);

  const handleCollapseArea = useCallback((areaName) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaName)) next.delete(areaName);
      else next.add(areaName);
      return next;
    });
  }, []);

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

  // Lamps, virtual switches and scenes can all live on this page.
  const allDevices = useMemo(
    () =>
      Object.values(entities).filter((e) => {
        if (e.state === undefined) return false;
        const domain = e.entity_id.split('.')[0];
        return domain === 'light' || domain === 'input_boolean' || domain === 'scene';
      }),
    [entities]
  );
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const availableLights = selectedSet
    ? allDevices.filter((entity) => selectedSet.has(entity.entity_id))
    : allDevices;

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
      manual: (a, b) => {
        const aIndex = manualOrder.indexOf(a.entity_id);
        const bIndex = manualOrder.indexOf(b.entity_id);
        if (aIndex === -1 && bIndex === -1) {
          const aName = a.attributes?.friendly_name || a.entity_id;
          const bName = b.attributes?.friendly_name || b.entity_id;
          return aName.localeCompare(bName);
        }
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      },
    };
    list.sort(sorters[sortMode] || sorters.status);
    if (sortMode !== 'manual') {
      list.sort(
        (a, b) => Number(favoriteSet.has(b.entity_id)) - Number(favoriteSet.has(a.entity_id))
      );
    }
    return list;
  }, [filteredLights, sortMode, getAreaName, favoriteSet, manualOrder]);

  const favoriteLights = useMemo(
    () => sortedLights.filter((e) => favoriteSet.has(e.entity_id)),
    [sortedLights, favoriteSet]
  );
  const remainingLights = useMemo(
    () => sortedLights.filter((e) => !favoriteSet.has(e.entity_id)),
    [sortedLights, favoriteSet]
  );
  const showFavoritesSection = favoriteLights.length > 0 && sortMode !== 'manual';

  // Group by area (favorites have their own section above)
  const areaGroups = useMemo(() => {
    if (sortMode !== 'area') return null;
    const result = new Map();
    remainingLights.forEach((e) => {
      const area = getAreaName(e) || t('lights.noArea') || 'Other';
      if (!result.has(area)) result.set(area, []);
      result.get(area).push(e);
    });
    return result;
  }, [sortMode, remainingLights, getAreaName, t]);

  const sceneQuickActions = useMemo(
    () => availableLights.filter((e) => e.entity_id.startsWith('scene.')).slice(0, 10),
    [availableLights]
  );

  const onCount = filteredLights.filter((e) => e.state === 'on').length;
  const totalCount = filteredLights.length;

  const handleToggle = useCallback(
    (entityId) => {
      const domain = getControlDomain(entityId);
      return callService(domain, domain === 'scene' ? 'turn_on' : 'toggle', {
        entity_id: entityId,
      });
    },
    [callService]
  );

  const handleOpen = useCallback(
    (entityId) => {
      if (getControlDomain(entityId) !== 'light') return;
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
    const targets = filteredLights.filter(
      (e) => e.state === 'on' && !e.entity_id.startsWith('scene.')
    );
    if (targets.length === 0) return;
    setUndoAllOff({
      lights: targets.map((e) => ({
        entity_id: e.entity_id,
        domain: getControlDomain(e.entity_id),
        brightness: e.attributes?.brightness,
      })),
    });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoAllOff(null), 6000);
    targets.forEach((e) =>
      callService(getControlDomain(e.entity_id), 'turn_off', { entity_id: e.entity_id })
    );
  }, [filteredLights, callService]);

  const handleUndoAllOff = useCallback(() => {
    if (!undoAllOff) return;
    undoAllOff.lights.forEach(({ entity_id, domain, brightness }) => {
      callService(domain || 'light', 'turn_on', {
        entity_id,
        ...(domain === 'light' && Number.isFinite(brightness) ? { brightness } : {}),
      });
    });
    setUndoAllOff(null);
    clearTimeout(undoTimerRef.current);
  }, [undoAllOff, callService]);

  const handleAllOn = useCallback(() => {
    filteredLights
      .filter(
        (e) =>
          e.state !== 'on' &&
          !isUnavailableState(e.state) &&
          !e.entity_id.startsWith('scene.')
      )
      .forEach((e) =>
        callService(getControlDomain(e.entity_id), 'turn_on', { entity_id: e.entity_id })
      );
  }, [filteredLights, callService]);

  const handleAreaOff = useCallback(
    (lights) => {
      lights
        .filter((e) => e.state === 'on' && !e.entity_id.startsWith('scene.'))
        .forEach((e) =>
          callService(getControlDomain(e.entity_id), 'turn_off', { entity_id: e.entity_id })
        );
    },
    [callService]
  );

  const handleMultiOn = useCallback(() => {
    availableLights
      .filter(
        (e) =>
          multiSelected.has(e.entity_id) &&
          !e.entity_id.startsWith('scene.') &&
          e.state !== 'on' &&
          !isUnavailableState(e.state)
      )
      .forEach((e) =>
        callService(getControlDomain(e.entity_id), 'turn_on', { entity_id: e.entity_id })
      );
  }, [availableLights, multiSelected, callService]);

  const handleMultiOff = useCallback(() => {
    availableLights
      .filter(
        (e) => multiSelected.has(e.entity_id) && !e.entity_id.startsWith('scene.') && e.state === 'on'
      )
      .forEach((e) =>
        callService(getControlDomain(e.entity_id), 'turn_off', { entity_id: e.entity_id })
      );
  }, [availableLights, multiSelected, callService]);

  const handleDragStart = useCallback((entityId) => {
    setDraggingId(entityId);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetId) => {
      const sourceId = draggingId;
      setDraggingId(null);
      if (!sourceId || sourceId === targetId) return;
      const ids = sortedLights.map((e) => e.entity_id);
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return;
      ids.splice(from, 1);
      ids.splice(to, 0, sourceId);
      setManualOrder(ids);
      setSortMode('manual');
      if (savePageSetting && pageId) {
        savePageSetting(pageId, 'lightsOrder', ids);
        savePageSetting(pageId, 'lightsSort', 'manual');
      }
    },
    [draggingId, sortedLights, savePageSetting, pageId]
  );

  useEffect(() => {
    if (sortMode !== 'manual' || manualOrder.length > 0) return;
    const ids = sortedLights.map((e) => e.entity_id);
    setManualOrder(ids);
    if (savePageSetting && pageId) savePageSetting(pageId, 'lightsOrder', ids);
  }, [sortMode, manualOrder.length, sortedLights, savePageSetting, pageId]);

  const saveSelection = (next) => {
    setSelectedIds(next);
    if (savePageSetting && pageId) savePageSetting(pageId, 'lightsSelection', next);
  };

  const toggleDevice = (entityId) => {
    const base = selectedSet ? [...selectedSet] : allDevices.map((entity) => entity.entity_id);
    const next = base.includes(entityId)
      ? base.filter((item) => item !== entityId)
      : [...base, entityId];
    const normalized =
      next.length === allDevices.length
        ? null
        : allDevices.map((entity) => entity.entity_id).filter((item) => next.includes(item));
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
    if (!query) return allDevices;
    return allDevices.filter((entity) => {
      const name = (entity.attributes?.friendly_name || entity.entity_id).toLowerCase();
      const area = (getAreaName(entity) || '').toLowerCase();
      return name.includes(query) || area.includes(query);
    });
  }, [allDevices, settingsQuery, getAreaName]);

  const renderTile = (entity, index) => (
    <LightTile
      key={entity.entity_id}
      entity={entity}
      entities={entities}
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
      index={index}
      selectMode={selectMode}
      selected={multiSelected.has(entity.entity_id)}
      onSelect={handleTileSelect}
      manualMode={sortMode === 'manual' && !selectMode}
      dragging={draggingId === entity.entity_id}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );

  const renderCompactRow = (entity, index) => (
    <CompactLightTile
      key={entity.entity_id}
      entity={entity}
      entities={entities}
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
      index={index}
      selectMode={selectMode}
      selected={multiSelected.has(entity.entity_id)}
      onSelect={handleTileSelect}
      manualMode={sortMode === 'manual' && !selectMode}
      dragging={draggingId === entity.entity_id}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );

  const renderGrid = (lights) =>
    viewMode === 'compact' ? (
      <div className="space-y-2">
        {lights.map((entity, index) => renderCompactRow(entity, index))}
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lights.map((entity, index) => renderTile(entity, index))}
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
          <div className="flex items-center overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <button
              type="button"
              onClick={() => handleViewChange('gallery')}
              aria-pressed={viewMode === 'gallery'}
              aria-label={t('lights.viewGallery') || 'Gallery view'}
              title={t('lights.viewGallery') || 'Gallery view'}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${
                viewMode === 'gallery'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('compact')}
              aria-pressed={viewMode === 'compact'}
              aria-label={t('lights.viewCompact') || 'Compact view'}
              title={t('lights.viewCompact') || 'Compact view'}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${
                viewMode === 'compact'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ListChecks className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleSelectMode}
            aria-pressed={selectMode}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-2xl border px-3 text-[11px] font-bold tracking-widest uppercase transition-colors ${
              selectMode
                ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('lights.selectMode') || 'Select'}</span>
          </button>
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

      {/* ── Customize drawer: visibility + icon + illustration ────────────── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[90] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={t('lights.customize') || 'Customize devices'}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
            aria-hidden="true"
          />
          <div className="popup-anim custom-scrollbar relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-[var(--glass-border)] bg-[var(--modal-bg)] p-4 shadow-2xl">
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

          <div className="grid gap-2">
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

      {/* ── Scenes quick actions ──────────────────────────────────────────── */}
      {sceneQuickActions.length > 0 && !selectMode && (
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase">
            <Play className="h-3 w-3" />
            {t('lights.scenes') || 'Scenes'}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {sceneQuickActions.map((scene) => {
              const sceneName = scene.attributes?.friendly_name || scene.entity_id.split('.')[1];
              const sceneIconName = getIconName(scene);
              const SceneIcon = sceneIconName ? getIconComponent(sceneIconName) || Sparkles : Sparkles;
              const sceneArt = getArtKey(scene);
              return (
                <button
                  key={scene.entity_id}
                  type="button"
                  onClick={() => handleToggle(scene.entity_id)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-[color-mix(in_srgb,#a78bfa_24%,var(--glass-border))] bg-[var(--glass-bg)] px-2.5 py-1.5 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,#a78bfa_16%,transparent)] text-[#a78bfa]">
                    {sceneArt ? (
                      <DeviceArtImage artKey={sceneArt} className="h-6 w-6 object-contain" />
                    ) : (
                      <SceneIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="max-w-[10rem] truncate text-xs font-semibold text-[var(--text-primary)]">
                    {sceneName}
                  </span>
                  <Play className="h-3 w-3 text-[#a78bfa]" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {totalCount > 0 ? (
        <>
          {showFavoritesSection && (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-[var(--domain-light)]" fill="currentColor" />
                <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                  {t('lights.filter.favorites') || 'Favorites'}
                </span>
                <div className="h-px flex-1 bg-[var(--glass-border)]" />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {favoriteLights.filter((e) => e.state === 'on').length}/{favoriteLights.length}
                </span>
              </div>
              {renderGrid(favoriteLights)}
            </div>
          )}
          {areaGroups ? (
            <div className="space-y-6">
              {[...areaGroups.entries()].map(([areaName, lights]) => {
                const collapsed = collapsedAreas.has(areaName);
                const onInArea = lights.filter((e) => e.state === 'on').length;
                return (
                  <div key={areaName}>
                    <div className="sticky top-0 z-20 -mx-2 mb-3 flex items-center gap-2 rounded-2xl bg-[var(--bg-primary)]/95 px-2 py-1.5 backdrop-blur">
                      <button
                        type="button"
                        onClick={() => handleCollapseArea(areaName)}
                        aria-expanded={!collapsed}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-0.5 text-left"
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform ${collapsed ? '' : 'rotate-90'}`}
                        />
                        <h3 className="shrink-0 text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                          {areaName}
                        </h3>
                        <div className="flex min-w-0 items-center gap-1">
                          {lights.slice(0, 10).map((e) => (
                            <span
                              key={e.entity_id}
                              aria-hidden="true"
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  e.state === 'on'
                                    ? e.entity_id.startsWith('scene.')
                                      ? '#a78bfa'
                                      : getLightColor(e, entities)
                                    : 'var(--text-muted)',
                                opacity: e.state === 'on' ? 1 : 0.35,
                              }}
                            />
                          ))}
                        </div>
                        <div className="h-px flex-1 bg-[var(--glass-border)]" />
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                          {onInArea}/{lights.length}
                        </span>
                      </button>
                      {onInArea > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAreaOff(lights)}
                          aria-label={`${areaName}: ${t('lights.allOff') || 'All off'}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {!collapsed && <div className="animate-in fade-in duration-300">{renderGrid(lights)}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            renderGrid(showFavoritesSection ? remainingLights : sortedLights)
          )}
        </>
      ) : availableLights.length === 0 && allDevices.length > 0 ? (
        <div className="flex min-h-[32vh] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--accent-color)] opacity-15 blur-2xl" />
            <div className="relative rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
              <Lightbulb className="h-12 w-12 text-[var(--text-primary)] opacity-60" />
            </div>
          </div>
          <p className="text-lg text-[var(--text-secondary)]">
            {t('appliances.noSelection')}
          </p>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            {t('lights.noResultsHint') || 'Choose the devices you want to see on this page.'}
          </p>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase"
          >
            {t('lights.customize') || 'Customize devices'}
          </button>
        </div>
      ) : hasActiveFilter ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Search className="mb-4 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-lg text-[var(--text-secondary)]">
            {t('lights.noResults') || 'No lights match your search'}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t('lights.noResultsHint') || 'Try a different search.'}
          </p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
          >
            {t('common.close') || 'Clear'}
          </button>
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--accent-color)] opacity-10 blur-2xl" />
            <div className="relative rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
              <Lightbulb className="h-12 w-12 text-[var(--text-primary)] opacity-60" />
            </div>
          </div>
          <p className="text-lg text-[var(--text-secondary)]">
            {t('lights.noLights') || 'No lights found'}
          </p>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            {t('lights.noDevicesHint') || 'No lights, switches or scenes are available.'}
          </p>
        </div>
      )}

      {selectMode && (
        <div className="fixed bottom-24 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--modal-bg)] px-3 py-2 shadow-xl backdrop-blur">
          <span className="px-2 text-xs font-bold text-[var(--text-primary)]">
            {multiSelected.size} {t('common.selected') || 'selected'}
          </span>
          <button
            type="button"
            onClick={handleMultiOn}
            className="rounded-full bg-[var(--accent-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-color)]"
          >
            {t('lights.allOn') || 'All on'}
          </button>
          <button
            type="button"
            onClick={handleMultiOff}
            className="rounded-full bg-[var(--accent-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--accent-color)]"
          >
            {t('lights.allOff') || 'All off'}
          </button>
          <button
            type="button"
            onClick={handleToggleSelectMode}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
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

