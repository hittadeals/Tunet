import { describe, it, expect } from 'vitest';
import {
  addRoomEntity,
  countBoundDevices,
  getAlarmInfo,
  getApplianceState,
  getApplianceStates,
  getDoorStates,
  getRoomLightEntityIds,
  listAlarmEntities,
  listDoorEntities,
  normalizeHouseBindings,
  removeRoomEntity,
  searchRoomEntities,
  setAlarmEntity,
  setApplianceEntity,
  setDoorEntity,
} from '../utils/houseBindings';
import { HOUSE_DOORS } from '../config/houseModel';

const entities = {
  'light.kok_tak': { state: 'on', attributes: { friendly_name: 'Kök tak' } },
  'light.hall': { state: 'off', attributes: { friendly_name: 'Hall' } },
  'switch.tvattmaskin': { state: 'off', attributes: { friendly_name: 'Tvättmaskin' } },
  'sensor.kok_temp': {
    state: '21.5',
    attributes: { friendly_name: 'Kök temp', device_class: 'temperature' },
  },
  'binary_sensor.ytterdorr': {
    state: 'on',
    attributes: { friendly_name: 'Ytterdörr', device_class: 'door' },
  },
  'binary_sensor.rorelse_hall': {
    state: 'off',
    attributes: { friendly_name: 'Rörelse hall', device_class: 'motion' },
  },
  'alarm_control_panel.hem': {
    state: 'armed_home',
    attributes: { friendly_name: 'Larm' },
  },
  'sensor.tvatt_effekt': {
    state: '312',
    attributes: { friendly_name: 'Tvätt effekt', device_class: 'power', unit_of_measurement: 'W' },
  },
  'sensor.tork_effekt': {
    state: '0.2',
    attributes: { friendly_name: 'Tork effekt', device_class: 'power', unit_of_measurement: 'W' },
  },
  'media_player.tv': { state: 'off', attributes: {} },
  not_an_entity: { state: 'on' },
};

describe('houseBindings', () => {
  it('normalizes old or broken settings into rooms and doors', () => {
    const bindings = normalizeHouseBindings({
      rooms: {
        kok: ['light.kok_tak', 'light.kok_tak', 'invalid', 12],
        hall: [],
        entre: 'light.hall',
      },
      doors: {
        front: 'binary_sensor.ytterdorr',
        back: 'nope',
      },
    });
    expect(bindings).toEqual({
      rooms: { kok: ['light.kok_tak'] },
      doors: { front: 'binary_sensor.ytterdorr' },
      alarm: '',
      appliances: {},
    });
  });

  it('normalizes the alarm and appliance bindings', () => {
    const bindings = normalizeHouseBindings({
      alarm: 'alarm_control_panel.hem',
      appliances: { washer: 'sensor.tvatt_effekt', dryer: 'nope' },
    });
    expect(bindings.alarm).toBe('alarm_control_panel.hem');
    expect(bindings.appliances).toEqual({ washer: 'sensor.tvatt_effekt' });
  });

  it('handles missing settings', () => {
    expect(normalizeHouseBindings(undefined)).toEqual({
      rooms: {},
      doors: {},
      alarm: '',
      appliances: {},
    });
    expect(normalizeHouseBindings(null)).toEqual({
      rooms: {},
      doors: {},
      alarm: '',
      appliances: {},
    });
  });

  it('adds and removes room entities without mutating the input', () => {
    const start = { rooms: {}, doors: {} };
    const added = addRoomEntity(start, 'kok', 'light.kok_tak');
    expect(start.rooms).toEqual({});
    expect(added.rooms.kok).toEqual(['light.kok_tak']);

    const again = addRoomEntity(added, 'kok', 'light.kok_tak');
    expect(again.rooms.kok).toEqual(['light.kok_tak']);

    const removed = removeRoomEntity(again, 'kok', 'light.kok_tak');
    expect(removed.rooms.kok).toBeUndefined();
  });

  it('binds and unbinds a door sensor', () => {
    const bound = setDoorEntity({ rooms: {}, doors: {} }, 'front', 'binary_sensor.ytterdorr');
    expect(bound.doors.front).toBe('binary_sensor.ytterdorr');
    expect(setDoorEntity(bound, 'front', '').doors.front).toBeUndefined();
  });

  it('reports door states from the bound sensors', () => {
    const bindings = {
      rooms: {},
      doors: { front: 'binary_sensor.ytterdorr', garage: 'binary_sensor.missing' },
    };
    expect(getDoorStates(HOUSE_DOORS, bindings, entities)).toEqual({
      front: true,
      garage: false,
    });
  });

  it('counts room, door, alarm and appliance bindings', () => {
    expect(
      countBoundDevices({
        rooms: { kok: ['light.kok_tak', 'sensor.kok_temp'], hall: ['light.hall'] },
        doors: { front: 'binary_sensor.ytterdorr' },
        alarm: 'alarm_control_panel.hem',
        appliances: { washer: 'sensor.tvatt_effekt' },
      })
    ).toBe(6);
  });

  it('derives alarm state and lists alarm panels', () => {
    const bindings = { alarm: 'alarm_control_panel.hem' };
    expect(getAlarmInfo(bindings, entities)).toMatchObject({
      entityId: 'alarm_control_panel.hem',
      state: 'armed_home',
      armed: true,
      triggered: false,
    });
    expect(listAlarmEntities(entities).map((item) => item.id)).toEqual(['alarm_control_panel.hem']);
    expect(setAlarmEntity({}, 'alarm_control_panel.hem').alarm).toBe('alarm_control_panel.hem');
    expect(setAlarmEntity({ alarm: 'alarm_control_panel.hem' }, '').alarm).toBe('');
  });

  it('detects a running appliance from plug power', () => {
    const bindings = {
      appliances: { washer: 'sensor.tvatt_effekt', dryer: 'sensor.tork_effekt' },
    };
    expect(getApplianceState(bindings, 'washer', entities)).toEqual({
      entityId: 'sensor.tvatt_effekt',
      running: true,
      power: 312,
    });
    expect(getApplianceState(bindings, 'dryer', entities).running).toBe(false);
    expect(getApplianceStates(bindings, entities).washer.running).toBe(true);
  });

  it('treats a bound smart plug as running when it is on', () => {
    const bindings = { appliances: { washer: 'switch.tvattmaskin' } };
    expect(
      getApplianceState(bindings, 'washer', {
        'switch.tvattmaskin': { state: 'on', attributes: {} },
      }).running
    ).toBe(true);
    expect(setApplianceEntity({}, 'washer', 'sensor.tvatt_effekt').appliances).toEqual({
      washer: 'sensor.tvatt_effekt',
    });
  });

  it('filters room entities by domain, search and exclusions', () => {
    const lightResults = searchRoomEntities(entities, { domain: 'light' });
    expect(lightResults.map((item) => item.id).sort()).toEqual(['light.hall', 'light.kok_tak']);

    const search = searchRoomEntities(entities, { query: 'kok' });
    expect(search.map((item) => item.id).sort()).toEqual(['light.kok_tak', 'sensor.kok_temp']);

    const excluded = searchRoomEntities(entities, {
      domain: 'light',
      exclude: ['light.hall'],
    });
    expect(excluded.map((item) => item.id)).toEqual(['light.kok_tak']);
  });

  it('puts real door sensors before other door-capable entities', () => {
    const list = listDoorEntities(entities);
    expect(list[0].id).toBe('binary_sensor.ytterdorr');
    expect(list.map((item) => item.id)).not.toContain('media_player.tv');
  });

  it('returns only light entities bound to a room', () => {
    const bindings = {
      rooms: { kok: ['light.kok_tak', 'sensor.kok_temp', 'switch.tvattmaskin'] },
      doors: {},
    };
    expect(getRoomLightEntityIds(bindings, 'kok')).toEqual(['light.kok_tak']);
  });
});
