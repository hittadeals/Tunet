import {
  DEFAULT_STATUS_GROUP_PRESET,
  STATUS_GROUP_PILL_TYPE,
  STATUS_GROUP_SELECTION_ALL,
} from './statusGroupPills';
import { normalizeDecimalPlaces } from './units';
import { normalizeStatusPillTapAction } from './statusPillActions';

const coercePillBoolean = (value, fallback) => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
};

const coerceConditionEnabled = (value) => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
};

/**
 * Normalise a persisted status-pill config. This is the single schema for the
 * localStorage data, so older entries keep working after new fields are added.
 */
export function normalizeStatusPillConfig(pill) {
  if (!pill || typeof pill !== 'object') return pill;

  return {
    ...pill,
    visible: coercePillBoolean(pill.visible, true),
    clickable: coercePillBoolean(pill.clickable, false),
    tapAction: normalizeStatusPillTapAction(pill.tapAction),
    animated: coercePillBoolean(pill.animated, true),
    showLabel: coercePillBoolean(pill.showLabel, true),
    showSublabel: coercePillBoolean(pill.showSublabel, true),
    showCover: coercePillBoolean(pill.showCover, true),
    showCount: coercePillBoolean(pill.showCount, false),
    decimals: normalizeDecimalPlaces(pill.decimals),
    hideWhenEmpty:
      pill.type === STATUS_GROUP_PILL_TYPE
        ? coercePillBoolean(pill.hideWhenEmpty, true)
        : pill.hideWhenEmpty,
    groupPreset:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupPreset !== 'string'
        ? DEFAULT_STATUS_GROUP_PRESET
        : pill.groupPreset,
    groupSelectionMode:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupSelectionMode !== 'string'
        ? STATUS_GROUP_SELECTION_ALL
        : pill.groupSelectionMode,
    groupEntityIds:
      pill.type === STATUS_GROUP_PILL_TYPE && !Array.isArray(pill.groupEntityIds)
        ? []
        : pill.groupEntityIds,
    conditionEnabled: coerceConditionEnabled(pill.conditionEnabled),
  };
}
