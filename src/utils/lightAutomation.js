export const LIGHT_AUTOMATION_KEY = 'tunet_light_automation';
export const LIGHT_AUTOMATION_EVENT = 'tunet:light-automation-changed';

const EMPTY = { followSun: false, offAtSunrise: false };

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLightAutomation() {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIGHT_AUTOMATION_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getLightAutomation(entityId) {
  if (!entityId) return { ...EMPTY };
  return { ...EMPTY, ...(readLightAutomation()[entityId] || {}) };
}

export function setLightAutomation(entityId, patch) {
  if (!entityId || !canUseStorage()) return;
  const next = readLightAutomation();
  next[entityId] = { ...EMPTY, ...(next[entityId] || {}), ...patch };
  if (!next[entityId].followSun && !next[entityId].offAtSunrise) {
    delete next[entityId];
  }
  window.localStorage.setItem(LIGHT_AUTOMATION_KEY, JSON.stringify(next));
  window.dispatchEvent(new window.CustomEvent(LIGHT_AUTOMATION_EVENT));
}
