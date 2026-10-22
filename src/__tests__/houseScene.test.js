import { describe, it, expect } from 'vitest';
import {
  buildAutoAreaMap,
  collectRoomEntityIds,
  getLightColor,
  getRoomCenter,
  getRoomStats,
  normalizeName,
  resolveAreaMap,
} from '../utils/houseScene';
import { fixturePositions } from '../utils/houseScene3d';

const rooms = [
  { id: 'kok', label: 'Kök', floor: 'ground', rects: [[0, 0, 4, 3]], keywords: ['kök', 'kitchen'] },
  {
    id: 'vardagsrum',
    label: 'Vardagsrum',
    floor: 'ground',
    rects: [[4, 0, 8, 4]],
    keywords: ['vardagsrum', 'living room'],
  },
];

describe('houseScene helpers', () => {
  it('normalizes names without diacritics', () => {
    expect(normalizeName('Kök & Vardagsrum')).toBe('kok vardagsrum');
    expect(normalizeName('  Entré  ')).toBe('entre');
  });

  it('matches areas by name and keeps matches unique', () => {
    const areas = [
      { area_id: 'a1', name: 'Kök' },
      { area_id: 'a2', name: 'Vardagsrum' },
      { area_id: 'a3', name: 'Kök' },
    ];
    const map = buildAutoAreaMap(rooms, areas);
    expect(map).toEqual({ kok: 'a1', vardagsrum: 'a2' });
  });

  it('lets saved overrides win and supports explicit unlink', () => {
    const areas = [
      { area_id: 'a1', name: 'Kök' },
      { area_id: 'a2', name: 'Vardagsrum' },
    ];
    const resolved = resolveAreaMap(rooms, areas, { kok: 'a2', vardagsrum: '' });
    expect(resolved.kok).toBe('a2');
    expect(resolved.vardagsrum).toBeUndefined();
  });

  it('collects entities from the mapped area', () => {
    const entities = {
      'light.kok_tak': { state: 'on', attributes: { friendly_name: 'Kök tak' } },
      'light.hall': { state: 'off', attributes: { friendly_name: 'Hall' } },
    };
    const result = collectRoomEntityIds({
      rooms,
      areaMap: { kok: 'a1' },
      areaEntityIds: { a1: ['light.kok_tak'] },
      entities,
    });
    expect(result.kok).toEqual(['light.kok_tak']);
  });

  it('falls back to friendly names when no area is mapped', () => {
    const entities = {
      'light.kok_tak': { state: 'on', attributes: { friendly_name: 'Kök tak' } },
      'light.hall': { state: 'off', attributes: { friendly_name: 'Hall' } },
    };
    const result = collectRoomEntityIds({ rooms, areaMap: {}, areaEntityIds: {}, entities });
    expect(result.kok).toEqual(['light.kok_tak']);
    expect(result.vardagsrum).toEqual([]);
  });

  it('aggregates lights, temperature and humidity', () => {
    const entities = {
      'light.kok_tak': { state: 'on', attributes: {} },
      'light.kok_spot': { state: 'off', attributes: {} },
      'sensor.kok_temp': {
        state: '21.44',
        attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
      },
      'sensor.kok_humidity': { state: '45.2', attributes: { device_class: 'humidity' } },
    };
    const stats = getRoomStats(rooms, { kok: Object.keys(entities) }, entities);
    expect(stats.kok.lightsOn).toBe(1);
    expect(stats.kok.lightsTotal).toBe(2);
    expect(stats.kok.temperature).toBe(21.4);
    expect(stats.kok.humidity).toBe(45);
  });

  it('resolves light colors from rgb and color temperature', () => {
    expect(getLightColor({ attributes: { rgb_color: [10, 20, 30] } })).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
    expect(getLightColor({ attributes: { color_temp_kelvin: 2200 } })).toEqual({
      r: 255,
      g: 166,
      b: 60,
    });
    expect(getLightColor({})).toEqual({ r: 255, g: 183, b: 77 });
  });

  it('centers rooms and spreads fixtures inside the room', () => {
    expect(getRoomCenter(rooms[0])).toEqual({ x: 2, z: 1.5 });
    const positions = fixturePositions(rooms[0], 2);
    expect(positions).toHaveLength(2);
    positions.forEach(({ x, z }) => {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(4);
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThan(3);
    });
  });
});
