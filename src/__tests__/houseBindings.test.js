import { describe, it, expect } from 'vitest';
import {
  addRoomEntity,
  countBoundDevices,
  getDoorStates,
  getRoomLightEntityIds,
  listDoorEntities,
  normalizeHouseBindings,
  removeRoomEntity,
  searchRoomEntities,
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
    });
  });

  it('handles missing settings', () => {
    expect(normalizeHouseBindings(undefined)).toEqual({ rooms: {}, doors: {} });
    expect(normalizeHouseBindings(null)).toEqual({ rooms: {}, doors: {} });
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

  it('counts room entities and door bindings', () => {
    expect(
      countBoundDevices({
        rooms: { kok: ['light.kok_tak', 'sensor.kok_temp'], hall: ['light.hall'] },
        doors: { front: 'binary_sensor.ytterdorr' },
      })
    ).toBe(4);
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
