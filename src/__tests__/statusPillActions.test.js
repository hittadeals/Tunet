import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callService } = vi.hoisted(() => ({ callService: vi.fn(() => Promise.resolve()) }));
vi.mock('../services/haClient', () => ({ callService }));

import {
  getStatusPillTapAction,
  isRiskyStatusPillEntity,
  isStatusGroupPillActionable,
  isStatusPillEntityOn,
  normalizeStatusPillTapAction,
  openStatusPillDetails,
  toggleStatusGroupPill,
  toggleStatusPillEntity,
} from '../utils/statusPillActions';

const entity = (entityId, state = 'off', attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes,
});

describe('status pill actions', () => {
  beforeEach(() => {
    callService.mockClear();
  });

  it('normalizes unknown tap actions to auto', () => {
    expect(normalizeStatusPillTapAction('toggle')).toBe('toggle');
    expect(normalizeStatusPillTapAction('more-info')).toBe('more-info');
    expect(normalizeStatusPillTapAction('none')).toBe('none');
    expect(normalizeStatusPillTapAction('wat')).toBe('auto');
  });

  it('auto-toggles controllable domains and opens info for sensors', () => {
    expect(getStatusPillTapAction({}, entity('light.kitchen'))).toBe('toggle');
    expect(getStatusPillTapAction({}, entity('switch.fan'))).toBe('toggle');
    expect(getStatusPillTapAction({}, entity('sensor.temperature'))).toBe('more-info');
    expect(getStatusPillTapAction({ tapAction: 'more-info' }, entity('light.kitchen'))).toBe(
      'more-info'
    );
    expect(getStatusPillTapAction({ tapAction: 'none' }, entity('light.kitchen'))).toBe('none');
  });

  it('toggles entities with the right HA service', async () => {
    const conn = {};
    await toggleStatusPillEntity(conn, entity('light.kitchen'));
    expect(callService).toHaveBeenLastCalledWith(conn, 'homeassistant', 'toggle', {
      entity_id: 'light.kitchen',
    });

    await toggleStatusPillEntity(conn, entity('scene.movie'));
    expect(callService).toHaveBeenLastCalledWith(conn, 'scene', 'turn_on', {
      entity_id: 'scene.movie',
    });

    await toggleStatusPillEntity(conn, entity('button.doorbell'));
    expect(callService).toHaveBeenLastCalledWith(conn, 'button', 'press', {
      entity_id: 'button.doorbell',
    });

    await expect(toggleStatusPillEntity(conn, entity('light.kitchen', 'unavailable'))).resolves.toBe(
      false
    );
    expect(callService).toHaveBeenCalledTimes(3);
  });

  it('opens the dedicated modal for common domains', () => {
    const actions = {
      closeAllModals: vi.fn(),
      setShowLightModal: vi.fn(),
      setActiveClimateEntityModal: vi.fn(),
      setShowSensorInfoModal: vi.fn(),
    };

    openStatusPillDetails('light.kitchen', entity('light.kitchen'), actions);
    expect(actions.setShowLightModal).toHaveBeenCalledWith('light.kitchen');

    openStatusPillDetails('climate.hall', entity('climate.hall'), actions);
    expect(actions.setActiveClimateEntityModal).toHaveBeenCalledWith({
      entityId: 'climate.hall',
      cardId: 'climate.hall',
    });

    openStatusPillDetails('sensor.temperature', entity('sensor.temperature'), actions);
    expect(actions.setShowSensorInfoModal).toHaveBeenCalledWith('sensor.temperature');
  });

  it('detects active states', () => {
    expect(isStatusPillEntityOn(entity('light.kitchen', 'on'))).toBe(true);
    expect(isStatusPillEntityOn(entity('cover.blind', 'open'))).toBe(true);
    expect(isStatusPillEntityOn(entity('media_player.tv', 'playing'))).toBe(true);
    expect(isStatusPillEntityOn(entity('light.kitchen', 'off'))).toBe(false);
  });

  it('marks locks, valves and garage covers as risky', () => {
    expect(isRiskyStatusPillEntity(entity('lock.front_door'))).toBe(true);
    expect(isRiskyStatusPillEntity(entity('valve.water_main'))).toBe(true);
    expect(
      isRiskyStatusPillEntity(
        entity('cover.garage', 'closed', { device_class: 'garage' })
      )
    ).toBe(true);
    expect(isRiskyStatusPillEntity(entity('cover.living_room', 'closed'))).toBe(false);
    expect(isRiskyStatusPillEntity(entity('light.kitchen', 'on'))).toBe(false);
  });

  it('runs the preset action for actionable group pills', async () => {
    const groupData = {
      preset: {
        actionDomain: 'light',
        actionService: 'turn_off',
      },
      matchedEntities: [{ id: 'light.kitchen' }, { id: 'light.hall' }],
    };
    expect(isStatusGroupPillActionable(groupData)).toBe(true);

    const conn = {};
    await toggleStatusGroupPill(conn, groupData);
    expect(callService).toHaveBeenLastCalledWith(conn, 'light', 'turn_off', {
      entity_id: ['light.kitchen', 'light.hall'],
    });

    expect(
      isStatusGroupPillActionable({ preset: { id: 'openings_open' }, matchedEntities: [] })
    ).toBe(false);
  });
});
