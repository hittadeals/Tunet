import { useRef, useEffect, useCallback, memo } from 'react';
import {
  LampCeiling,
  LampDesk,
  LampFloor,
  LampWallUp,
  Lightbulb,
  getIconComponent,
} from '../../icons';
import { getLightColor } from '../../utils/houseScene';
import { getDeviceArtSrc, resolveEntityArtKey } from '../../config/deviceArt';
import { getEntityDomainAccent } from './entityVisual';
import CardArtPlate from './CardArtPlate';
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
  const br = getA(entityId, 'brightness') || 0;
  const subEntities = getA(entityId, 'entity_id', []);
  const activeCount = subEntities.filter((id) => entities[id]?.state === 'on').length;
  const totalCount = subEntities.length;
  const name = customNames[cardId] || getA(entityId, 'friendly_name') || t('common.light');

  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : (entity?.attributes?.supported_features & 1) === 1;

  const { r, g, b } = getLightColor(entity);
  const lightColor = `rgb(${r}, ${g}, ${b})`;
  const iconName = customIcons[cardId] || entity?.attributes?.icon;
  const DefaultIcon = getDefaultLightIcon(entityId, name);
  const Icon = iconName ? getIconComponent(iconName) || DefaultIcon : DefaultIcon;
  const artSrc = getDeviceArtSrc(resolveEntityArtKey(entityId, entity, customArt));
  const accent = getEntityDomainAccent(entityId, entity);
  const percent = Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100);

  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleBrightnessChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value);
      setOptimisticLightBrightness((prev) => ({ ...prev, [cardId]: val }));
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        callService('light', 'turn_on', { entity_id: entityId, brightness: val });
      }, SLIDER_DEBOUNCE_MS);
    },
    [cardId, entityId, callService, setOptimisticLightBrightness]
  );

  const handleToggleLight = useCallback(
    (event) => {
      event.stopPropagation();
      if (isUnavailable) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
    },
    [entityId, callService, isUnavailable, isOn]
  );

  const statusText = isUnavailable
    ? t('status.unavailable')
    : totalCount > 0
      ? `${isOn ? t('common.on') : t('common.off')} · ${activeCount}/${totalCount}`
      : isOn
        ? t('common.on')
        : t('common.off');

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
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
        isMobile ? 'gap-2 p-4' : 'gap-3 p-5'
      } ${!editMode ? 'cursor-pointer active:scale-[0.99]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, '--light-accent': isOn ? lightColor : 'var(--text-muted)' }}
    >
      {controls}

      <div className="flex min-w-0 items-center gap-3">
        {artSrc ? (
          <CardArtPlate artSrc={artSrc} size="standard" accent={accent} active={isOn} />
        ) : (
          <span
            className={`card-art-plate card-art-plate--accent ${isOn ? 'card-art-plate--active' : ''}`}
            style={{ '--plate-accent': isOn ? lightColor : accent }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: isOn ? lightColor : 'var(--text-secondary)' }}
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="card-title truncate">{String(name)}</p>
          <p className="card-meta flex items-center gap-1.5">
            {isOn && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: lightColor }}
              />
            )}
            <span className="truncate">{statusText}</span>
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label={`${name}: ${isOn ? t('common.off') : t('common.on')}`}
          disabled={isUnavailable}
          onClick={handleToggleLight}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
            isOn
              ? 'border-transparent'
              : 'border-[var(--surface-border)] bg-[var(--glass-bg-hover)]'
          }`}
          style={isOn ? { backgroundColor: lightColor } : undefined}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isOn ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isDimmable && (
        <div className="flex w-full items-center">
          <M3Slider
            variant="thinLg"
            min={0}
            max={255}
            step={1}
            value={optimisticLightBrightness[cardId] ?? br}
            disabled={isUnavailable}
            onChange={handleBrightnessChange}
            colorClass="bg-[var(--light-accent)]"
            ariaLabel={t('light.brightness')}
            ariaValueText={`${percent}%`}
          />
        </div>
      )}
    </div>
  );
};

export default memo(LightCard);
