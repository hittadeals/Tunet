import { useRef, useEffect, useCallback, useState, memo } from 'react';
import {
  LampCeiling,
  LampDesk,
  LampFloor,
  LampWallUp,
  Layers,
  Lightbulb,
  getIconComponent,
} from '../../icons';
import { getDeviceArtSrc } from '../../config/deviceArt';
import { getEntityDomainAccent } from './entityVisual';
import CardArtPlate from './CardArtPlate';
import LightQuickSheet from './LightQuickSheet';
import M3Slider from '../ui/M3Slider';

const SLIDER_DEBOUNCE_MS = 200;

function getDefaultLightIcon(entityId, name) {
  const value = `${entityId || ''} ${name || ''}`.toLowerCase();
  if (/(tak|ceiling|pendel|chandelier|krona)/.test(value)) return LampCeiling;
  if (/(golv|floor|stativ)/.test(value)) return LampFloor;
  if (/(vag|vägg|wall|spot)/.test(value)) return LampWallUp;
  if (/(skrivbord|desk|bord|table)/.test(value)) return LampDesk;
  return Lightbulb;
}

/** @param {any} props */
const LightCard = ({
  cardId,
  entityId: entityIdProp,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  customArt,
  getA,
  callService,
  onOpen,
  isMobile,
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  t,
}) => {
  const entityId = entityIdProp || cardId;
  const entity = entities[entityId];
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state === 'on';
  const [optimisticOn, setOptimisticOn] = useState(null);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const longPressRef = useRef(null);
  const longPressOriginRef = useRef(null);
  const suppressClickRef = useRef(false);
  useEffect(() => {
    setOptimisticOn(null);
  }, [state]);
  useEffect(() => {
    if (!quickMenuOpen && !groupSheetOpen) suppressClickRef.current = false;
  }, [quickMenuOpen, groupSheetOpen]);
  useEffect(() => () => clearTimeout(longPressRef.current), []);
  const visualIsOn = optimisticOn ?? isOn;
  const br = getA(entityId, 'brightness') || 0;
  const subEntities = getA(entityId, 'entity_id', []);
  const activeCount = subEntities.filter((id) => entities[id]?.state === 'on').length;
  const totalCount = subEntities.length;
  const groupMembers = subEntities.map((id) => entities[id]).filter(Boolean);
  const groupBrightness = groupMembers
    .filter((member) => member.state === 'on')
    .map((member) => member.attributes?.brightness)
    .filter(Number.isFinite);
  const hasMixedBrightness =
    groupBrightness.length > 1 && Math.max(...groupBrightness) - Math.min(...groupBrightness) > 12;
  const name = customNames[cardId] || getA(entityId, 'friendly_name') || t('common.light');
  const sizeSetting =
    cardSettings?.[settingsKey]?.size || cardSettings?.[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : (entity?.attributes?.supported_features & 1) === 1;

  const iconName = customIcons[cardId] || entity?.attributes?.icon;
  const DefaultIcon = getDefaultLightIcon(entityId, name);
  const Icon = iconName ? getIconComponent(iconName) || DefaultIcon : DefaultIcon;
  const artOverride = customArt?.[entityId];
  const artSrc =
    artOverride && artOverride !== 'none' ? getDeviceArtSrc(artOverride) : null;
  const accent = getEntityDomainAccent(entityId, entity);
  const percent = Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100);
  const isGroup = totalCount > 0;
  const displayActiveCount =
    groupMembers.length > 0 && optimisticOn !== null
      ? optimisticOn
        ? totalCount
        : 0
      : activeCount;
  const fillPercent = visualIsOn ? Math.min(100, Math.max(0, percent)) : 0;
  const brightnessFill = `linear-gradient(90deg, color-mix(in srgb, var(--domain-light) 16%, transparent) 0%, color-mix(in srgb, var(--domain-light) 16%, transparent) ${fillPercent}%, transparent ${fillPercent}%)`;
  const ambientTint =
    'linear-gradient(135deg, color-mix(in srgb, var(--domain-light) 6%, transparent), transparent 70%)';

  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleBrightnessChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value);
      const previous = optimisticLightBrightness[cardId] ?? br;
      setOptimisticLightBrightness((prev) => ({ ...prev, [cardId]: val }));
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        Promise.resolve()
          .then(() => callService('light', 'turn_on', { entity_id: entityId, brightness: val }))
          .catch(() => {
            setOptimisticLightBrightness((prev) => ({ ...prev, [cardId]: previous }));
          });
      }, SLIDER_DEBOUNCE_MS);
    },
    [
      br,
      cardId,
      entityId,
      callService,
      optimisticLightBrightness,
      setOptimisticLightBrightness,
    ]
  );

  const handleToggleLight = useCallback(
    (event) => {
      event.stopPropagation();
      if (isUnavailable) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      const nextIsOn = !visualIsOn;
      setOptimisticOn(nextIsOn);
      Promise.resolve()
        .then(() =>
          callService('light', nextIsOn ? 'turn_on' : 'turn_off', { entity_id: entityId })
        )
        .catch(() => setOptimisticOn(null));
    },
    [entityId, callService, isUnavailable, visualIsOn]
  );

  const statusText = isUnavailable
    ? t('status.unavailable')
    : totalCount > 0
      ? `${displayActiveCount}/${totalCount}${
          displayActiveCount > 0
            ? ` ${hasMixedBrightness ? t('light.mixed') : t('common.on')}`
            : ''
        }`
      : visualIsOn
        ? t('common.on')
        : t('common.off');

  const clearLongPress = useCallback(() => {
    clearTimeout(longPressRef.current);
    longPressRef.current = null;
    longPressOriginRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (editMode || event.button !== 0) return;
      clearLongPress();
      longPressOriginRef.current = { x: event.clientX, y: event.clientY };
      longPressRef.current = setTimeout(() => {
        suppressClickRef.current = true;
        setGroupSheetOpen(false);
        setQuickMenuOpen(true);
        navigator.vibrate?.(8);
      }, 500);
    },
    [clearLongPress, editMode]
  );

  const handlePointerMove = useCallback(
    (event) => {
      const origin = longPressOriginRef.current;
      if (!origin) return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 8) {
        clearLongPress();
      }
    },
    [clearLongPress]
  );

  const handleContextMenu = useCallback(
    (event) => {
      if (editMode) return;
      event.preventDefault();
      clearLongPress();
      setGroupSheetOpen(false);
      setQuickMenuOpen(true);
    },
    [clearLongPress, editMode]
  );

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        if (!editMode) onOpen();
      }}
      onKeyDown={(e) => {
        if (editMode) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }
      }}
      role={editMode ? undefined : 'button'}
      tabIndex={editMode ? -1 : 0}
      className={`touch-feedback group relative flex h-full flex-col justify-center overflow-hidden rounded-3xl border font-sans transition-all duration-300 ${
        isSmall ? 'gap-2 p-3' : isMobile ? 'gap-2 p-4' : 'gap-3 p-5'
      } ${!editMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundImage: visualIsOn ? `${brightnessFill}, ${ambientTint}` : undefined,
        borderColor: visualIsOn
          ? 'color-mix(in srgb, var(--domain-light) 26%, var(--surface-border))'
          : cardStyle?.borderColor,
      }}
    >
      {controls}

      <div className="flex min-w-0 items-center gap-3">
        {artSrc ? (
          <CardArtPlate
            artSrc={artSrc}
            size={isSmall ? 'compact' : 'standard'}
            accent={accent}
            active={visualIsOn}
          />
        ) : (
          <span
            className={`card-art-plate card-art-plate--accent ${isSmall ? 'card-art-plate--compact' : ''} ${visualIsOn ? 'card-art-plate--active' : ''}`}
            style={{ '--plate-accent': visualIsOn ? 'var(--domain-light)' : accent }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: visualIsOn ? 'var(--domain-light)' : 'var(--text-secondary)' }}
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="card-title truncate">{String(name)}</p>
            {isGroup && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clearLongPress();
                  setQuickMenuOpen(false);
                  setGroupSheetOpen(true);
                }}
                aria-haspopup="dialog"
                aria-label={`${totalCount} ${t('lights.groups')}`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <Layers className="h-3 w-3" aria-hidden="true" />
                {totalCount}
                <span className="ml-0.5 flex items-center gap-0.5" aria-hidden="true">
                  {groupMembers.slice(0, 3).map((member, index) => (
                    <span
                      key={member.entity_id || index}
                      className="h-1 w-1 rounded-full"
                      style={{
                        backgroundColor:
                          member.state === 'on'
                            ? 'var(--domain-light)'
                            : 'var(--text-muted)',
                      }}
                    />
                  ))}
                </span>
              </button>
            )}
          </div>
          <p className="card-meta flex items-center gap-1.5">
            {visualIsOn && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: 'var(--domain-light)' }}
              />
            )}
            <span className="truncate">{statusText}</span>
            {visualIsOn && isDimmable && (
              <span className="ml-auto shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">
                {percent} %
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={visualIsOn}
          aria-label={`${name}: ${visualIsOn ? t('common.off') : t('common.on')}`}
          disabled={isUnavailable}
          onClick={handleToggleLight}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
            visualIsOn
              ? 'border-transparent'
              : 'border-[var(--surface-border)] bg-[var(--glass-bg-hover)]'
          } ${optimisticOn !== null ? 'opacity-80' : ''}`}
          style={visualIsOn ? { backgroundColor: 'var(--domain-light)' } : undefined}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform duration-200 ${
              visualIsOn ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {!isSmall && visualIsOn && isDimmable && (
        <div className="flex w-full items-center">
          <M3Slider
            variant="level"
            min={0}
            max={255}
            step={1}
            value={optimisticLightBrightness[cardId] ?? br}
            disabled={isUnavailable}
            onChange={handleBrightnessChange}
            colorClass="bg-[var(--domain-light)]"
            ariaLabel={t('light.brightness')}
            ariaValueText={`${percent}%`}
          />
        </div>
      )}

      <LightQuickSheet
        open={quickMenuOpen || groupSheetOpen}
        mode={groupSheetOpen ? 'group' : 'quick'}
        name={String(name)}
        entityId={entityId}
        entity={entity}
        members={groupMembers}
        callService={callService}
        optimisticLightBrightness={optimisticLightBrightness}
        setOptimisticLightBrightness={setOptimisticLightBrightness}
        onClose={() => {
          setQuickMenuOpen(false);
          setGroupSheetOpen(false);
        }}
        onDetails={() => {
          setQuickMenuOpen(false);
          setGroupSheetOpen(false);
          onOpen();
        }}
        onShowGroup={
          groupMembers.length > 0
            ? () => {
                setQuickMenuOpen(false);
                setGroupSheetOpen(true);
              }
            : undefined
        }
        t={t}
      />
    </div>
  );
};

function areLightCardPropsEqual(prev, next) {
  if (prev.cardId !== next.cardId || prev.entityIdProp !== next.entityIdProp) return false;
  if (prev.editMode !== next.editMode || prev.isMobile !== next.isMobile) return false;
  if (prev.t !== next.t || prev.callService !== next.callService || prev.getA !== next.getA) {
    return false;
  }
  if (prev.customNames?.[prev.cardId] !== next.customNames?.[next.cardId]) return false;
  if (prev.customIcons?.[prev.cardId] !== next.customIcons?.[next.cardId]) return false;
  const prevArtKey = prev.entityIdProp || prev.cardId;
  const nextArtKey = next.entityIdProp || next.cardId;
  if (prev.customArt?.[prevArtKey] !== next.customArt?.[nextArtKey]) return false;
  if (
    (prev.optimisticLightBrightness?.[prev.cardId] ?? null) !==
    (next.optimisticLightBrightness?.[next.cardId] ?? null)
  ) {
    return false;
  }
  const prevSize =
    prev.cardSettings?.[prev.settingsKey]?.size || prev.cardSettings?.[prev.cardId]?.size;
  const nextSize =
    next.cardSettings?.[next.settingsKey]?.size || next.cardSettings?.[next.cardId]?.size;
  if (prevSize !== nextSize) return false;

  const prevEntity = prev.entities?.[prevArtKey];
  const nextEntity = next.entities?.[nextArtKey];
  if (prevEntity !== nextEntity) return false;

  const prevMembers = prevEntity?.attributes?.entity_id || [];
  const nextMembers = nextEntity?.attributes?.entity_id || [];
  if (prevMembers.length !== nextMembers.length) return false;
  for (let index = 0; index < prevMembers.length; index += 1) {
    if (prevMembers[index] !== nextMembers[index]) return false;
    if (prev.entities?.[prevMembers[index]] !== next.entities?.[nextMembers[index]]) return false;
  }

  const styleKeys = [
    'transform',
    'animation',
    'animationDelay',
    'backgroundColor',
    'borderColor',
    'borderWidth',
    'borderStyle',
    'borderRadius',
    'opacity',
    'filter',
    'backdropFilter',
    'boxShadow',
    'zIndex',
    'pointerEvents',
    'transition',
  ];
  return styleKeys.every(
    (key) => prev.cardStyle?.[key] === next.cardStyle?.[key]
  );
}

export default memo(LightCard, areLightCardPropsEqual);
