import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIGHT_AUTOMATION_KEY,
  getLightAutomation,
  setLightAutomation,
} from '../utils/lightAutomation';

describe('light automation settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults for unknown lights', () => {
    expect(getLightAutomation('light.a')).toEqual({
      followSun: false,
      offAtSunrise: false,
    });
  });

  it('persists follow-sun and removes empty entries', () => {
    setLightAutomation('light.a', { followSun: true });
    expect(getLightAutomation('light.a').followSun).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(LIGHT_AUTOMATION_KEY))).toHaveProperty(
      'light.a'
    );

    setLightAutomation('light.a', { followSun: false });
    expect(JSON.parse(window.localStorage.getItem(LIGHT_AUTOMATION_KEY))).not.toHaveProperty(
      'light.a'
    );
  });
});
