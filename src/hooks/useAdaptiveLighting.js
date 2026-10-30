import { useEffect, useRef } from 'react';
import {
  LIGHT_AUTOMATION_EVENT,
  readLightAutomation,
} from '../utils/lightAutomation';

const APPLY_INTERVAL_MS = 5 * 60 * 1000;

function kelvinForElevation(elevation) {
  if (elevation > 30) return 5500;
  if (elevation > 10) return 4500;
  if (elevation > 0) return 3200;
  return 2400;
}

/**
 * Applies the optional "follow sun" and "off at sunrise" automations while the
 * dashboard is open. Everything is opt-in per light and persisted locally.
 */
export function useAdaptiveLighting({ entities, callService }) {
  const configRef = useRef(readLightAutomation());
  const lastRunRef = useRef(0);
  const lastSunStateRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const refresh = () => {
      configRef.current = readLightAutomation();
    };
    window.addEventListener(LIGHT_AUTOMATION_EVENT, refresh);
    return () => window.removeEventListener(LIGHT_AUTOMATION_EVENT, refresh);
  }, []);

  const sun = entities?.['sun.sun'];
  const elevation = Number(sun?.attributes?.elevation);
  const sunState = sun?.state;

  useEffect(() => {
    if (!callService || !entities || !Number.isFinite(elevation)) return;
    const config = configRef.current;
    const entries = Object.entries(config);
    if (!entries.length) return;

    const previousSunState = lastSunStateRef.current;
    lastSunStateRef.current = sunState;

    const sunrise = previousSunState === 'below_horizon' && sunState === 'above_horizon';
    if (sunrise) {
      entries.forEach(([entityId, settings]) => {
        if (settings.offAtSunrise && entities[entityId]?.state === 'on') {
          callService('light', 'turn_off', { entity_id: entityId });
        }
      });
    }

    const now = Date.now();
    if (now - lastRunRef.current < APPLY_INTERVAL_MS) return;
    lastRunRef.current = now;

    const kelvin = kelvinForElevation(elevation);
    entries.forEach(([entityId, settings]) => {
      if (!settings.followSun) return;
      const entity = entities[entityId];
      if (!entity || entity.state !== 'on') return;
      const modes = entity.attributes?.supported_color_modes || [];
      if (!modes.includes('color_temp') && !modes.includes('color_temp_kelvin')) return;
      const min = entity.attributes?.min_color_temp_kelvin || 2200;
      const max = entity.attributes?.max_color_temp_kelvin || 6500;
      const target = Math.min(max, Math.max(min, kelvin));
      callService('light', 'turn_on', {
        entity_id: entityId,
        color_temp_kelvin: target,
        transition: 30,
      });
    });
  }, [callService, elevation, sunState, entities]);
}
