import { callService as haCallService } from '../services/haClient';

/** Domains where a plain tap should toggle/activate the entity. */
const TAP_TOGGLE_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'input_boolean',
  'cover',
  'media_player',
  'siren',
  'humidifier',
  'valve',
  'water_heater',
  'scene',
  'script',
  'button',
]);

export const STATUS_PILL_TAP_ACTIONS = ['auto', 'toggle', 'more-info', 'none'];

export function normalizeStatusPillTapAction(value) {
  return STATUS_PILL_TAP_ACTIONS.includes(value) ? value : 'auto';
}

export function canToggleStatusPillEntity(entity) {
  if (!entity?.entity_id) return false;
  const domain = String(entity.entity_id).split('.')[0];
  return TAP_TOGGLE_DOMAINS.has(domain);
}

/** Resolve what a tap on a status pill should do. */
export function getStatusPillTapAction(pill, entity) {
  const configured = normalizeStatusPillTapAction(pill?.tapAction);
  if (configured !== 'auto') return configured;
  return canToggleStatusPillEntity(entity) ? 'toggle' : 'more-info';
}

export function isStatusPillEntityOn(entity) {
  const state = String(entity?.state || '').toLowerCase();
  return ['on', 'open', 'opening', 'playing', 'active', 'heat', 'cool'].includes(state);
}

/** Entities where a single accidental tap can have physical consequences. */
export function isRiskyStatusPillEntity(entity) {
  const entityId = String(entity?.entity_id || '');
  const domain = entityId.split('.')[0];
  if (domain === 'lock') return true;
  if (domain === 'valve') return true;
  if (domain !== 'cover') return false;
  const deviceClass = String(entity?.attributes?.device_class || '').toLowerCase();
  return (
    ['garage', 'garage_door', 'gate', 'door'].includes(deviceClass) ||
    /garage|port|grind|gate/i.test(entityId)
  );
}

export function isStatusGroupPillActionable(groupData) {
  return Boolean(
    groupData?.preset?.actionDomain &&
      groupData?.preset?.actionService &&
      groupData?.matchedEntities?.length
  );
}

/** Run the group preset action (turn off all lights, close all covers, …). */
export function toggleStatusGroupPill(conn, groupData) {
  if (!isStatusGroupPillActionable(groupData)) return Promise.resolve(false);
  const entityIds = groupData.matchedEntities
    .map((row) => row.id)
    .filter((id) => typeof id === 'string' && id);
  if (entityIds.length === 0) return Promise.resolve(false);
  return haCallService(
    conn,
    groupData.preset.actionDomain,
    groupData.preset.actionService,
    { entity_id: entityIds }
  );
}

/** Call the HA service that represents a tap on the pill. */
export function toggleStatusPillEntity(conn, entity) {
  if (!entity?.entity_id) return Promise.resolve(false);
  const state = String(entity.state || '').toLowerCase();
  if (state === 'unavailable' || state === 'unknown') return Promise.resolve(false);
  const domain = String(entity.entity_id).split('.')[0];
  const service =
    domain === 'scene' || domain === 'script'
      ? 'turn_on'
      : domain === 'button'
        ? 'press'
        : 'toggle';
  const serviceDomain = domain === 'scene' || domain === 'script' || domain === 'button'
    ? domain
    : 'homeassistant';
  return haCallService(conn, serviceDomain, service, { entity_id: entity.entity_id });
}

/**
 * Open the richest detail view available for an entity. Falls back to the
 * generic sensor/info modal for domains without a dedicated modal.
 */
export function openStatusPillDetails(entityId, entity, modalActions = {}) {
  if (!entityId) return false;
  const domain = String(entityId).split('.')[0];
  const closeAll = typeof modalActions.closeAllModals === 'function'
    ? modalActions.closeAllModals
    : null;
  closeAll?.();

  switch (domain) {
    case 'light':
      if (modalActions.setShowLightModal) {
        modalActions.setShowLightModal(entityId);
        return true;
      }
      break;
    case 'climate':
      if (modalActions.setActiveClimateEntityModal) {
        modalActions.setActiveClimateEntityModal({ entityId, cardId: entityId });
        return true;
      }
      break;
    case 'fan':
      if (modalActions.setShowFanModal) {
        modalActions.setShowFanModal(entityId);
        return true;
      }
      break;
    case 'vacuum':
      if (modalActions.setShowVacuumModal) {
        modalActions.setActiveVacuumId?.(entityId);
        modalActions.setShowVacuumModal(true);
        return true;
      }
      break;
    case 'lawn_mower':
      if (modalActions.setShowMowerModal) {
        modalActions.setActiveMowerId?.(entityId);
        modalActions.setShowMowerModal(true);
        return true;
      }
      break;
    case 'media_player':
      if (modalActions.setActiveMediaModal) {
        modalActions.setActiveMediaSessionSensorIds?.(null);
        modalActions.setActiveMediaGroupKey?.(null);
        modalActions.setActiveMediaGroupIds?.(null);
        modalActions.setActiveMediaId?.(entityId);
        modalActions.setActiveMediaModal('media');
        return true;
      }
      break;
    case 'alarm_control_panel':
      if (modalActions.setShowAlarmModal) {
        modalActions.setShowAlarmModal(entityId);
        return true;
      }
      break;
    case 'camera':
      if (modalActions.setShowCameraModal) {
        modalActions.setShowCameraModal(entityId);
        return true;
      }
      break;
    default:
      break;
  }

  if (modalActions.setShowSensorInfoModal) {
    modalActions.setShowSensorInfoModal(entityId);
    return true;
  }
  return false;
}
